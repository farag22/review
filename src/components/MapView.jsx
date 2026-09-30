import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistance } from "../lib/geo";

// تم استبدال رابط الخرائط برابط OpenStreetMap النظيف والخالي تماماً من طلب المفاتيح
const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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

function carIcon(heading) {
  const rot = Number.isFinite(heading) ? heading : 0;
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
  const headingKey = Number.isFinite(driver?.heading) ? Math.round(driver.heading) : 0;

  useEffect(() => {
    if (!wrapRef.current || mapRef.current) return undefined;
    const center = userLocation || pickup || driver || { lat: 30.466, lng: 31.185 };
    const map = L.map(wrapRef.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    }).setView([center.lat, center.lng], 15);
    
    L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 }).addTo(map);
    if (interactive) L.control.zoom({ position: "topleft" }).addTo(map);
    
    layersRef.current.markers = L.layerGroup().addTo(map);
    layersRef.current.pins = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", (e) => {
      if (!clickRef.current) return;
      clickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    const resize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ animate: false });
      }
    };
    
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current);
    window.addEventListener("resize", resize);
    
    const t1 = setTimeout(resize, 100);
    const t2 = setTimeout(resize, 300);
    const t3 = setTimeout(resize, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", resize);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const toggle = interactive ? "enable" : "disable";
    map.dragging[toggle]();
    map.scrollWheelZoom[toggle]();
    map.doubleClickZoom[toggle]();
    map.touchZoom[toggle]();
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
    upsert("driver", driver, carIcon(driver?.heading), false);

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

    layers.pins.clearLayers();
    (ridePins || []).forEach((pin) => {
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
    const fitKey = `${pickupKey}|${destinationKey}|${pathKey}|${requestsKey}|${JSON.stringify(pad)}`;
    if (fitKey !== lastFitRef.current) {
      lastFitRef.current = fitKey;
      const bounds = [];
      if (pickup?.lat != null) bounds.push([pickup.lat, pickup.lng]);
      if (destination?.lat != null) bounds.push([destination.lat, destination.lng]);
      if (path?.length > 1) path.forEach((p) => bounds.push(p));
      (ridePins || []).forEach((p) => {
        if (p.lat != null) bounds.push([p.lat, p.lng]);
      });
      if (!bounds.length && driver?.lat != null) bounds.push([driver.lat, driver.lng]);
      if (!bounds.length && gpsPoint) bounds.push([gpsPoint.lat, gpsPoint.lng]);
      if (bounds.length > 1) {
        map.fitBounds(bounds, { maxZoom: 16, animate: false, ...pad });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 15, { animate: false });
      }
      map.invalidateSize({ animate: false });
    } else if (followRef.current && driver?.lat != null) {
      map.panTo([driver.lat, driver.lng], { animate: true, duration: 0.35 });
    } else if (followRef.current && gpsPoint) {
      map.panTo([gpsPoint.lat, gpsPoint.lng], { animate: true, duration: 0.35 });
    }
  }, [pickupKey, destinationKey, driverKey, userKey, pathKey, requestsKey, headingKey, showAccuracy]);

  function recenter() {
    const map = mapRef.current;
    const target = userLocation || driver || pickup;
    if (!map || target?.lat == null) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 16), { duration: 0.45 });
  }

  const cssHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#d7e4dc] ${fill ? "h-full min-h-[46vh] rounded-none" : "rounded-2xl"}`}
      style={{ height: fill ? "100%" : cssHeight, minHeight: fill ? "46vh" : undefined, direction: "ltr" }}
    >
      <div ref={wrapRef} className="absolute inset-0 z-0 w-full h-full" />
      {routeInfo?.distanceKm != null ? (
        <div className="sd-map-chip absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          {formatDistance(routeInfo.distanceKm)}
          {routeInfo.durationMin != null ? ` · ${routeInfo.durationMin} د` : ""}
        </div>
      ) : null}
      {showRecenter ? (
        <button
          type="button"
          onClick={recenter}
          className="sd-overlay-btn absolute bottom-3 right-3 z-20 w-11 h-11 rounded-full bg-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] border border-black/5 flex items-center justify-center"
          aria-label="موقعي"
        >
          <span className="sd-gps-btn" />
        </button>
      ) : null}
      {children ? <div className="absolute inset-0 z-10 pointer-events-none">{children}</div> : null}
    </div>
  );
}
