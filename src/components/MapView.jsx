import React, { useEffect, useRef } from "react";
import L from "../lib/leaflet";
import { formatDistance, formatMinutes } from "../lib/geo";

const TILE_LAYERS = [
  {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    attr: "&copy; OpenStreetMap",
  },
  {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attr: "&copy; OpenStreetMap &copy; CARTO",
  },
];

const DEFAULT_CENTER = { lat: 30.466, lng: 31.185 };
const DEFAULT_ZOOM = 16;

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pointOf(point) {
  const lat = number(point?.lat ?? point?.[0]);
  const lng = number(point?.lng ?? point?.[1]);
  return lat == null || lng == null ? null : { lat, lng };
}

function pathOf(path) {
  if (!Array.isArray(path)) return [];
  return path.map(pointOf).filter(Boolean).map((p) => [p.lat, p.lng]);
}

function pointKey(point) {
  const p = pointOf(point);
  return p ? `${p.lat.toFixed(5)},${p.lng.toFixed(5)}` : "";
}

function pinsKey(pins) {
  if (!Array.isArray(pins)) return "";
  return pins.map((p) => `${p?.id || ""}:${pointKey(p)}`).join("|");
}

function headingOf(point) {
  const heading = Number(point?.heading);
  return Number.isFinite(heading) && heading >= 0 ? heading % 360 : null;
}

function shortestTurn(from, to) {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function pinIcon(color, label, live) {
  const pulse = live
    ? `<span style="position:absolute;inset:-7px;border-radius:50%;border:2px solid ${color};opacity:.4;animation:sd-pulse 1.6s ease-out infinite"></span>`
    : "";
  return L.divIcon({
    className: "sd-marker",
    html: `<div style="position:relative;width:30px;height:30px;">
      ${pulse}
      <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 4px 10px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);color:#fff;font:700 11px Cairo,sans-serif">${label || ""}</span>
      </div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

function userDotIcon() {
  return L.divIcon({
    className: "sd-marker",
    html: `<div class="sd-user-dot"><span class="sd-user-dot-pulse"></span><span class="sd-user-dot-core"></span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function carIcon(heading, mapRotated) {
  const rotation = mapRotated ? 0 : headingOf({ heading }) || 0;
  return L.divIcon({
    className: "sd-marker",
    html: `<div style="width:36px;height:36px;transform:rotate(${rotation}deg);filter:drop-shadow(0 3px 6px rgba(15,23,42,.35))">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#1d4ed8" stroke="#fff" stroke-width="2"/>
        <path d="M18 8l7 18-7-4-7 4z" fill="#fff"/>
      </svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function requestIcon(label) {
  return L.divIcon({
    className: "sd-marker",
    html: `<div class="sd-ride-pin">${label || "طلب"}</div>`,
    iconSize: [54, 28],
    iconAnchor: [27, 28],
  });
}

function safeRemove(map, layer) {
  if (!map || !layer) return;
  try {
    map.removeLayer(layer);
  } catch {
    // The map may already be unmounted.
  }
}

export default function MapView({
  height = 220,
  pickup,
  destination,
  driver,
  path,
  userLocation,
  follow = false,
  fill = false,
  fitPadding,
  locate = false,
  onLocate,
  children,
  interactive = true,
  onMapClick,
  onPickupDrag,
  onDestinationDrag,
  ridePins,
  onRidePinClick,
  showAccuracy = false,
  showRecenter = false,
  routeInfo,
}) {
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ markers: null, pins: null, route: null, routeGlow: null, pickup: null, destination: null, driver: null, user: null, accuracy: null });
  const followRef = useRef(follow);
  const interactiveRef = useRef(interactive);
  const pausedRef = useRef(false);
  const viewInitializedRef = useRef(false);
  const bearingRef = useRef(0);
  const bearingFrameRef = useRef(null);
  const clickRef = useRef(onMapClick);
  const pickupDragRef = useRef(onPickupDrag);
  const destinationDragRef = useRef(onDestinationDrag);
  const pinClickRef = useRef(onRidePinClick);
  const pointsRef = useRef({ pickup, destination, driver, path, userLocation, ridePins });

  followRef.current = Boolean(follow);
  interactiveRef.current = Boolean(interactive);
  clickRef.current = onMapClick;
  pickupDragRef.current = onPickupDrag;
  destinationDragRef.current = onDestinationDrag;
  pinClickRef.current = onRidePinClick;
  pointsRef.current = { pickup, destination, driver, path, userLocation, ridePins };

  const pickupKey = pointKey(pickup);
  const destinationKey = pointKey(destination);
  const driverKey = pointKey(driver);
  const userKey = pointKey(userLocation);
  const pathKey = pathOf(path).map((p) => p.join(",")).join("|");
  const requestsKey = pinsKey(ridePins);
  const headingKey = Math.round(headingOf(driver) ?? headingOf(userLocation) ?? 0);

  useEffect(() => {
    if (!wrapRef.current || mapRef.current) return undefined;
    const element = wrapRef.current;
    let map;
    const center = pointOf(userLocation) || pointOf(pickup) || pointOf(driver) || DEFAULT_CENTER;

    try {
      map = L.map(element, {
        zoomControl: false,
        attributionControl: true,
        dragging: interactiveRef.current,
        scrollWheelZoom: interactiveRef.current,
        doubleClickZoom: interactiveRef.current,
        touchZoom: interactiveRef.current,
        boxZoom: interactiveRef.current,
        keyboard: interactiveRef.current,
        rotate: true,
        bearing: 0,
        rotateControl: false,
        compassBearing: false,
        touchRotate: interactiveRef.current,
        shiftKeyRotate: false,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
      }).setView([center.lat, center.lng], DEFAULT_ZOOM, { animate: false });
    } catch {
      // A malformed plugin must never produce a white screen.
      try {
        map = L.map(element, {
          zoomControl: false,
          attributionControl: true,
          dragging: interactiveRef.current,
          scrollWheelZoom: interactiveRef.current,
          doubleClickZoom: interactiveRef.current,
          touchZoom: interactiveRef.current,
          boxZoom: interactiveRef.current,
          keyboard: interactiveRef.current,
        }).setView([center.lat, center.lng], DEFAULT_ZOOM, { animate: false });
      } catch {
        return undefined;
      }
    }

    const tileLayer = L.tileLayer(TILE_LAYERS[0].url, { attribution: TILE_LAYERS[0].attr, maxZoom: 20, detectRetina: true }).addTo(map);
    let fallbackIndex = 0;
    tileLayer.on("tileerror", () => {
      if (fallbackIndex >= TILE_LAYERS.length - 1 || !mapRef.current) return;
      fallbackIndex += 1;
      const fallback = TILE_LAYERS[fallbackIndex];
      L.tileLayer(fallback.url, { attribution: fallback.attr, maxZoom: 20, detectRetina: true }).addTo(map);
    });

    if (interactiveRef.current) L.control.zoom({ position: "topleft" }).addTo(map);
    layersRef.current.markers = L.layerGroup().addTo(map);
    layersRef.current.pins = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", (event) => clickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng }));
    const pauseFollowing = () => {
      if (followRef.current) pausedRef.current = true;
    };
    map.on("dragstart", pauseFollowing);
    map.on("zoomstart", pauseFollowing);
    map.on("rotatestart", pauseFollowing);

    const resize = () => {
      try { map.invalidateSize({ animate: false }); } catch { /* unmounted */ }
    };
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(element);
    window.addEventListener("resize", resize);
    const resizeTimer1 = setTimeout(resize, 80);
    const resizeTimer2 = setTimeout(resize, 400);

    return () => {
      clearTimeout(resizeTimer1);
      clearTimeout(resizeTimer2);
      if (bearingFrameRef.current) cancelAnimationFrame(bearingFrameRef.current);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      try { map.remove(); } catch { /* already removed */ }
      mapRef.current = null;
      layersRef.current = { markers: null, pins: null, route: null, routeGlow: null, pickup: null, destination: null, driver: null, user: null, accuracy: null };
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    ["dragging", "scrollWheelZoom", "doubleClickZoom", "touchZoom", "boxZoom", "keyboard"].forEach((name) => {
      try {
        const control = map[name];
        if (!control) return;
        interactive ? control.enable() : control.disable();
      } catch { /* plugin control unavailable */ }
    });
  }, [interactive]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers.markers) return;
    const current = pointsRef.current;
    const currentPath = pathOf(current.path);
    const gps = pointOf(current.userLocation);
    const pickupPoint = pointOf(current.pickup);
    const destinationPoint = pointOf(current.destination);
    const driverPoint = pointOf(current.driver);

    const upsert = (kind, point, icon, draggable, onDrag) => {
      if (!point) {
        safeRemove(map, layers[kind]);
        layers[kind] = null;
        return;
      }
      const latLng = [point.lat, point.lng];
      if (layers[kind]) {
        layers[kind].setLatLng(latLng);
        layers[kind].setIcon(icon);
        draggable ? layers[kind].dragging?.enable() : layers[kind].dragging?.disable();
        return;
      }
      const marker = L.marker(latLng, { icon, draggable: Boolean(draggable), autoPan: true });
      if (onDrag) marker.on("dragend", (event) => {
        const position = event.target.getLatLng();
        onDrag({ lat: position.lat, lng: position.lng });
      });
      marker.addTo(layers.markers);
      layers[kind] = marker;
    };

    const showUser = gps && pointKey(gps) !== pointKey(pickupPoint) && pointKey(gps) !== pointKey(driverPoint);
    upsert("user", showUser ? gps : null, userDotIcon(), false);
    upsert("pickup", pickupPoint, pinIcon("#059669", "أ", false), Boolean(pickupDragRef.current), pickupDragRef.current);
    upsert("destination", destinationPoint, pinIcon("#dc2626", "ب", false), Boolean(destinationDragRef.current), destinationDragRef.current);
    const heading = headingOf(current.driver) ?? headingOf(gps);
    upsert("driver", driverPoint, carIcon(current.driver?.heading, followRef.current && heading != null), false);

    if (showAccuracy && gps && Number(current.userLocation?.accuracy) > 8 && Number(current.userLocation?.accuracy) < 250) {
      if (layers.accuracy) {
        layers.accuracy.setLatLng([gps.lat, gps.lng]);
        layers.accuracy.setRadius(Number(current.userLocation.accuracy));
      } else {
        layers.accuracy = L.circle([gps.lat, gps.lng], { radius: Number(current.userLocation.accuracy), color: "#2563eb", weight: 1, fillColor: "#3b82f6", fillOpacity: 0.12 }).addTo(map);
      }
    } else if (layers.accuracy) {
      safeRemove(map, layers.accuracy);
      layers.accuracy = null;
    }

    if (currentPath.length > 1) {
      if (!layers.route || !layers.routeGlow) {
        safeRemove(map, layers.route);
        safeRemove(map, layers.routeGlow);
        layers.routeGlow = L.polyline(currentPath, { color: "#6ee7b7", weight: 12, opacity: 0.35, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
        layers.route = L.polyline(currentPath, { color: "#059669", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
      } else {
        layers.routeGlow.setLatLngs(currentPath);
        layers.route.setLatLngs(currentPath);
      }
    } else {
      safeRemove(map, layers.route);
      safeRemove(map, layers.routeGlow);
      layers.route = null;
      layers.routeGlow = null;
    }

    layers.pins?.clearLayers();
    (Array.isArray(current.ridePins) ? current.ridePins : []).forEach((pin) => {
      const p = pointOf(pin);
      if (!p || !layers.pins) return;
      L.marker([p.lat, p.lng], { icon: requestIcon(pin.label || "طلب") })
        .on("click", (event) => { L.DomEvent.stopPropagation(event); pinClickRef.current?.(pin); })
        .addTo(layers.pins);
    });

    // The viewport is fitted exactly once, only before the user interacts with it.
    // Subsequent GPS, route and pin updates preserve the user's zoom and bearing.
    if (!viewInitializedRef.current) {
      const bounds = [];
      [pickupPoint, destinationPoint, driverPoint, gps].filter(Boolean).forEach((p) => bounds.push([p.lat, p.lng]));
      currentPath.forEach((p) => bounds.push(p));
      (Array.isArray(current.ridePins) ? current.ridePins : []).map(pointOf).filter(Boolean).forEach((p) => bounds.push([p.lat, p.lng]));
      const padding = fitPadding || { padding: [48, 48] };
      if (bounds.length > 1) {
        try { map.fitBounds(bounds, { maxZoom: DEFAULT_ZOOM, animate: false, ...padding }); } catch { /* keep initial view */ }
        viewInitializedRef.current = true;
      } else if (bounds.length === 1) {
        try { map.panTo(bounds[0], { animate: false }); } catch { /* keep initial view */ }
        viewInitializedRef.current = true;
      }
    }

    const target = followRef.current ? driverPoint || gps : null;
    if (target && !pausedRef.current) {
      try { map.panTo([target.lat, target.lng], { animate: true, duration: 0.35, noMoveStart: true }); } catch { /* ignore stale map */ }
      const nextBearing = headingOf(current.driver) ?? headingOf(current.userLocation);
      if (nextBearing != null && typeof map.setBearing === "function") {
        const start = Number(map.getBearing?.()) || bearingRef.current || 0;
        const delta = shortestTurn(start, nextBearing);
        if (Math.abs(delta) >= 2) {
          const started = performance.now();
          const animate = (now) => {
            if (!mapRef.current) return;
            const progress = Math.min(1, (now - started) / 220);
            try { map.setBearing(start + delta * (1 - Math.pow(1 - progress, 3))); } catch { return; }
            if (progress < 1) bearingFrameRef.current = requestAnimationFrame(animate);
            else bearingRef.current = nextBearing;
          };
          if (bearingFrameRef.current) cancelAnimationFrame(bearingFrameRef.current);
          bearingFrameRef.current = requestAnimationFrame(animate);
        }
      }
    }
  }, [pickupKey, destinationKey, driverKey, userKey, pathKey, requestsKey, headingKey, showAccuracy, fitPadding]);

  function recenter() {
    const map = mapRef.current;
    const point = pointOf(driver) || pointOf(userLocation) || pointOf(pickup);
    if (!map || !point) return;
    pausedRef.current = false;
    try { map.panTo([point.lat, point.lng], { animate: true, duration: 0.45 }); } catch { /* ignore */ }
    const nextBearing = headingOf(driver) ?? headingOf(userLocation);
    if (nextBearing != null && typeof map.setBearing === "function") {
      try { map.setBearing(nextBearing); bearingRef.current = nextBearing; } catch { /* rotate plugin unavailable */ }
    }
  }

  const cssHeight = typeof height === "number" ? `${height}px` : height;
  return (
    <div className={`relative w-full overflow-hidden bg-[#d7e4dc] ${fill ? "h-full min-h-[46vh] rounded-none" : "rounded-2xl"}`} style={{ height: fill ? "100%" : cssHeight, minHeight: fill ? "46vh" : undefined, direction: "ltr" }}>
      <div ref={wrapRef} className="absolute inset-0 z-0" />
      {routeInfo?.distanceKm != null ? <div className="sd-map-chip absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">{formatDistance(routeInfo.distanceKm)}{routeInfo.durationMin != null ? ` · ${formatMinutes(routeInfo.durationMin)}` : ""}</div> : null}
      {locate ? <button type="button" onClick={onLocate} className="absolute z-20 bottom-3 left-3 w-11 h-11 rounded-full bg-white shadow-card border border-black/10 flex items-center justify-center" aria-label="موقعي الحالي">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#0b7350" strokeWidth="2" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="#0b7350" strokeWidth="2" strokeLinecap="round" /></svg>
      </button> : null}
      {showRecenter ? <button type="button" onClick={recenter} className="sd-overlay-btn absolute bottom-3 right-3 z-20 w-11 h-11 rounded-full bg-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] border border-black/5 flex items-center justify-center" aria-label="إعادة التمركز"><span className="sd-gps-btn" /></button> : null}
      {children ? <div className="absolute inset-0 z-10 pointer-events-none">{children}</div> : null}
    </div>
  );
}
