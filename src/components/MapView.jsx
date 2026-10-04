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

function pointKey(point) {
  if (!point || point.lat == null || point.lng == null) return "";
  return `${Number(point.lat).toFixed(5)},${Number(point.lng).toFixed(5)}`;
}

function samePoint(a, b) {
  return pointKey(a) === pointKey(b);
}

function routePathKey(path) {
  if (!path || path.length < 2) return "";
  const a = path[0];
  const b = path[path.length - 1];
  const lat0 = Number(Array.isArray(a) ? a[0] : a.lat).toFixed(4);
  const lng0 = Number(Array.isArray(a) ? a[1] : a.lng).toFixed(4);
  const lat1 = Number(Array.isArray(b) ? b[0] : b.lat).toFixed(4);
  const lng1 = Number(Array.isArray(b) ? b[1] : b.lng).toFixed(4);
  return `${path.length}:${lat0},${lng0}:${lat1},${lng1}`;
}

function pinsKey(pins) {
  if (!pins?.length) return "";
  return pins.map((p) => `${p.id}:${pointKey(p)}`).join("|");
}

function pinIcon(color, label, live) {
  const pulse = live
    ? `<span style="position:absolute;inset:-7px;border-radius:50%;border:2px solid ${color};opacity:.4;animation:sd-pulse 1.6s ease-out infinite"></span>`
    : "";
  return L.divIcon({
    className: "sd-marker",
    html: `<div style="position:relative;width:30px;height:30px;">
      ${pulse}
      <div style="
        width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${color};border:2px solid #fff;box-shadow:0 4px 10px rgba(15,23,42,.28);
        display:flex;align-items:center;justify-content:center;">
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
    html: `<div class="sd-user-dot">
      <span class="sd-user-dot-pulse"></span>
      <span class="sd-user-dot-core"></span>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function headingOf(point) {
  const value = point?.heading;
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function shortestTurn(from, to) {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function carIcon(heading, mapRotated) {
  const rot = mapRotated ? 0 : headingOf({ heading }) || 0;
  return L.divIcon({
    className: "sd-marker",
    html: `<div style="width:36px;height:36px;transform:rotate(${rot}deg);filter:drop-shadow(0 3px 6px rgba(15,23,42,.35))">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
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
  const layersRef = useRef({
    markers: null,
    pins: null,
    route: null,
    routeGlow: null,
    pickup: null,
    destination: null,
    driver: null,
    user: null,
    accuracy: null,
  });
  const lastFitRef = useRef("");
  const followRef = useRef(follow);
  const pausedRef = useRef(false);
  const clickRef = useRef(onMapClick);
  const pickupDragRef = useRef(onPickupDrag);
  const destDragRef = useRef(onDestinationDrag);
  const pinClickRef = useRef(onRidePinClick);
  const pointsRef = useRef({ pickup, destination, driver, path, userLocation, ridePins });

  followRef.current = follow;
  clickRef.current = onMapClick;
  pickupDragRef.current = onPickupDrag;
  destDragRef.current = onDestinationDrag;
  pinClickRef.current = onRidePinClick;
  pointsRef.current = { pickup, destination, driver, path, userLocation, ridePins };

  const pickupKey = pointKey(pickup);
  const destinationKey = pointKey(destination);
  const driverKey = pointKey(driver);
  const userKey = pointKey(userLocation);
  const pathKey = routePathKey(path);
  const requestsKey = pinsKey(ridePins);
  const headingKey = Math.round(headingOf(driver) ?? headingOf(userLocation) ?? 0);

  useEffect(() => {
    if (!wrapRef.current || mapRef.current) return undefined;
    const el = wrapRef.current;
    if (el._leaflet_id) {
      el._leaflet_id = null;
    }
    const center = userLocation || pickup || driver || { lat: 30.466, lng: 31.185 };
    let map;
    try {
      map = L.map(el, {
        zoomControl: false,
        attributionControl: true,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        rotate: typeof L.map.prototype.setBearing === "function",
        bearing: 0,
        rotateControl: false,
        compassBearing: false,
        touchRotate: interactive,
        shiftKeyRotate: false,
      }).setView([Number(center.lat) || 30.466, Number(center.lng) || 31.185], 16);
    } catch {
      try {
        map = L.map(el, {
          zoomControl: false,
          attributionControl: true,
          dragging: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
          touchZoom: interactive,
          boxZoom: interactive,
          keyboard: interactive,
        }).setView([Number(center.lat) || 30.466, Number(center.lng) || 31.185], 16);
      } catch {
        return undefined;
      }
    }
    const first = TILE_LAYERS[0];
    const tiles = L.tileLayer(first.url, {
      attribution: first.attr,
      maxZoom: 20,
      detectRetina: true,
    }).addTo(map);
    let tileIndex = 0;
    tiles.on("tileerror", () => {
      if (tileIndex >= TILE_LAYERS.length - 1) return;
      tileIndex += 1;
      const next = TILE_LAYERS[tileIndex];
      L.tileLayer(next.url, { attribution: next.attr, maxZoom: 19 }).addTo(map);
    });
    if (interactive) L.control.zoom({ position: "topleft" }).addTo(map);
    layersRef.current.markers = L.layerGroup().addTo(map);
    layersRef.current.pins = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", (e) => {
      if (!clickRef.current) return;
      clickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.on("dragstart", () => {
      if (followRef.current) pausedRef.current = true;
    });

    const resize = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* map already removed */
      }
    };
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (ro && wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", resize);
    const t1 = setTimeout(resize, 80);
    const t2 = setTimeout(resize, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", resize);
      try {
        ro?.disconnect();
      } catch {
        /* ignore */
      }
      try {
        map.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const toggle = interactive ? "enable" : "disable";
    try {
      map.dragging?.[toggle]?.();
      map.scrollWheelZoom?.[toggle]?.();
      map.doubleClickZoom?.[toggle]?.();
      map.touchZoom?.[toggle]?.();
    } catch {
      /* map already removed */
    }
  }, [interactive]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers.markers) return;
    const { pickup, destination, driver, path, userLocation, ridePins } = pointsRef.current;

    function upsert(kind, point, icon, draggable, onDrag) {
      if (!point || point.lat == null || point.lng == null) {
        if (layers[kind]) {
          layers.markers.removeLayer(layers[kind]);
          layers[kind] = null;
        }
        return;
      }
      const latlng = [point.lat, point.lng];
      if (layers[kind]) {
        layers[kind].setLatLng(latlng);
        layers[kind].setIcon(icon);
        if (draggable) layers[kind].dragging?.enable();
        else layers[kind].dragging?.disable();
      } else {
        const marker = L.marker(latlng, { icon, draggable: Boolean(draggable), autoPan: true });
        if (onDrag) {
          marker.on("dragend", (e) => {
            const pos = e.target.getLatLng();
            onDrag({ lat: pos.lat, lng: pos.lng });
          });
        }
        marker.addTo(layers.markers);
        layers[kind] = marker;
      }
    }

    const gpsPoint = userLocation && userLocation.lat != null ? userLocation : null;
    const showUserDot = gpsPoint && !samePoint(gpsPoint, pickup) && !samePoint(gpsPoint, driver);
    upsert("user", showUserDot ? gpsPoint : null, userDotIcon(), false);
    upsert(
      "pickup",
      pickup,
      pinIcon("#059669", "أ", false),
      Boolean(pickupDragRef.current),
      (pt) => pickupDragRef.current?.(pt)
    );
    upsert(
      "destination",
      destination,
      pinIcon("#dc2626", "ب", false),
      Boolean(destDragRef.current),
      (pt) => destDragRef.current?.(pt)
    );
    const followHeading = headingOf(driver) ?? headingOf(gpsPoint);
    const mapRotated = Boolean(followRef.current && Number.isFinite(followHeading));
    upsert("driver", driver, carIcon(driver?.heading, mapRotated), false);

    if (showAccuracy && gpsPoint?.accuracy > 8 && gpsPoint.accuracy < 250) {
      if (layers.accuracy) {
        layers.accuracy.setLatLng([gpsPoint.lat, gpsPoint.lng]);
        layers.accuracy.setRadius(gpsPoint.accuracy);
      } else {
        layers.accuracy = L.circle([gpsPoint.lat, gpsPoint.lng], {
          radius: gpsPoint.accuracy,
          color: "#2563eb",
          weight: 1,
          fillColor: "#3b82f6",
          fillOpacity: 0.12,
        }).addTo(map);
      }
    } else if (layers.accuracy) {
      map.removeLayer(layers.accuracy);
      layers.accuracy = null;
    }

    if (path?.length > 1) {
      if (layers.route && layers.routeGlow) {
        layers.routeGlow.setLatLngs(path);
        layers.route.setLatLngs(path);
      } else {
        if (layers.route) map.removeLayer(layers.route);
        if (layers.routeGlow) map.removeLayer(layers.routeGlow);
        layers.routeGlow = L.polyline(path, {
          color: "#6ee7b7",
          weight: 12,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        layers.route = L.polyline(path, {
          color: "#059669",
          weight: 5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
      }
    } else if (layers.route || layers.routeGlow) {
      if (layers.route) map.removeLayer(layers.route);
      if (layers.routeGlow) map.removeLayer(layers.routeGlow);
      layers.route = null;
      layers.routeGlow = null;
    }

    layers.pins?.clearLayers();
    (ridePins || []).forEach((pin) => {
      if (!layers.pins) return;
      if (pin.lat == null || pin.lng == null) return;
      const marker = L.marker([pin.lat, pin.lng], {
        icon: requestIcon(pin.label || "طلب"),
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        pinClickRef.current?.(pin);
      });
      marker.addTo(layers.pins);
    });

    const pad = fitPadding || { padding: [48, 48] };
    const followTarget = followRef.current && !(ridePins || []).length ? driver || gpsPoint : null;
    if (followTarget?.lat != null) {
      if (!pausedRef.current) {
        map.panTo([followTarget.lat, followTarget.lng], { animate: true, duration: 0.35 });
        const heading = headingOf(followTarget) ?? headingOf(driver) ?? headingOf(gpsPoint);
        if (Number.isFinite(heading) && typeof map.setBearing === "function") {
          try {
            const current = Number(map.getBearing?.()) || 0;
            if (Math.abs(shortestTurn(current, heading)) >= 3) map.setBearing(heading);
          } catch {
            /* rotate plugin unavailable */
          }
        }
      }
    } else {
      const fitKey = `${pickupKey}|${destinationKey}|${pathKey}|${requestsKey}|${JSON.stringify(pad)}`;
      if (fitKey !== lastFitRef.current) {
        lastFitRef.current = fitKey;
        const bounds = [];
        if (pickup?.lat != null) bounds.push([pickup.lat, pickup.lng]);
        if (destination?.lat != null) bounds.push([destination.lat, destination.lng]);
        if (path?.length > 1) path.forEach((p) => bounds.push(Array.isArray(p) ? p : [p.lat, p.lng]));
        (ridePins || []).forEach((p) => {
          if (p.lat != null) bounds.push([p.lat, p.lng]);
        });
        if (!bounds.length && driver?.lat != null) bounds.push([driver.lat, driver.lng]);
        if (!bounds.length && gpsPoint) bounds.push([gpsPoint.lat, gpsPoint.lng]);
        if (bounds.length > 1) {
          map.fitBounds(bounds, { maxZoom: 17, animate: false, ...pad });
        } else if (bounds.length === 1) {
          map.panTo(bounds[0], { animate: false });
        }
        setTimeout(() => {
          try {
            map.invalidateSize({ animate: false });
          } catch {
            /* map already removed */
          }
        }, 50);
      } else if (userLocation?.lat != null && !destination?.lat && !pickup?.lat) {
        map.panTo([userLocation.lat, userLocation.lng], { animate: true });
      }
      if (typeof map.setBearing === "function") {
        try {
          if (Math.abs(Number(map.getBearing?.()) || 0) > 0.5) map.setBearing(0);
        } catch {
          /* rotate plugin unavailable */
        }
      }
    }
  }, [pickupKey, destinationKey, driverKey, userKey, pathKey, requestsKey, headingKey, showAccuracy]);

  function recenter() {
    const map = mapRef.current;
    const target = driver || userLocation || pickup;
    if (!map || target?.lat == null) return;
    pausedRef.current = false;
    map.panTo([target.lat, target.lng], { animate: true, duration: 0.45 });
    const heading = headingOf(target) ?? headingOf(driver) ?? headingOf(userLocation);
    if (followRef.current && Number.isFinite(heading) && typeof map.setBearing === "function") {
      try {
        map.setBearing(heading);
      } catch {
        /* rotate plugin unavailable */
      }
    }
  }

  const cssHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#d7e4dc] ${fill ? "h-full min-h-[46vh] rounded-none" : "rounded-2xl"}`}
      style={{ height: fill ? "100%" : cssHeight, minHeight: fill ? "46vh" : undefined, direction: "ltr" }}
    >
      <div ref={wrapRef} className="absolute inset-0 z-0" />
      {routeInfo?.distanceKm != null ? (
        <div className="sd-map-chip absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          {formatDistance(routeInfo.distanceKm)}
          {routeInfo.durationMin != null ? ` · ${formatMinutes(routeInfo.durationMin)}` : ""}
        </div>
      ) : null}
      {locate ? (
        <button
          type="button"
          onClick={onLocate}
          className="absolute z-20 bottom-3 left-3 w-11 h-11 rounded-full bg-white shadow-card border border-black/10 flex items-center justify-center"
          aria-label="موقعي الحالي"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="#0b7350" strokeWidth="2" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="#0b7350" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
      {showRecenter ? (
        <button
          type="button"
          onClick={recenter}
          className="sd-overlay-btn absolute bottom-3 right-3 z-20 w-11 h-11 rounded-full bg-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] border border-black/5 flex items-center justify-center"
          aria-label="إعادة التمركز"
        >
          <span className="sd-gps-btn" />
        </button>
      ) : null}
      {children ? <div className="absolute inset-0 z-10 pointer-events-none">{children}</div> : null}
    </div>
  );
}
