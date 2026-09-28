import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = "&copy; OpenStreetMap";

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

function divIcon(color, label, live) {
  const pulse = live
    ? `<span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:.45;animation:sd-pulse 1.6s ease-out infinite"></span>`
    : "";
  return L.divIcon({
    className: "sd-marker",
    html: `<div style="position:relative;width:28px;height:28px;">
      ${pulse}
      <div style="
        width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);color:#fff;font:700 11px Cairo,sans-serif">${label || ""}</span>
      </div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
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
}) {
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({
    markers: null,
    route: null,
    routeGlow: null,
    pickup: null,
    destination: null,
    driver: null,
    user: null,
  });
  const lastFitRef = useRef("");
  const followRef = useRef(follow);
  const pointsRef = useRef({ pickup, destination, driver, path, userLocation });
  followRef.current = follow;
  pointsRef.current = { pickup, destination, driver, path, userLocation };
  const pickupKey = pointKey(pickup);
  const destinationKey = pointKey(destination);
  const driverKey = pointKey(driver);
  const userKey = pointKey(userLocation);
  const pathKey = routePathKey(path);

  useEffect(() => {
    if (!wrapRef.current || mapRef.current) return undefined;
    const center = userLocation || pickup || driver || { lat: 30.466, lng: 31.185 };
    const map = L.map(wrapRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([center.lat, center.lng], 14);
    L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 }).addTo(map);
    layersRef.current.markers = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resize = () => map.invalidateSize({ animate: false });
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current);
    window.addEventListener("resize", resize);
    const t1 = setTimeout(resize, 80);
    const t2 = setTimeout(resize, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", resize);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers.markers) return;
    const { pickup, destination, driver, path, userLocation } = pointsRef.current;

    function upsert(kind, point, color, label, live) {
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
      } else {
        layers[kind] = L.marker(latlng, { icon: divIcon(color, label, live) }).addTo(layers.markers);
      }
    }

    upsert("pickup", pickup, "#0b7350", "أ", false);
    upsert("destination", destination, "#d9534f", "ب", false);
    upsert("user", userLocation && !samePoint(userLocation, pickup) ? userLocation : null, "#0b7350", "أ", false);
    upsert("driver", driver, "#1d4ed8", "س", Boolean(followRef.current || driver));

    if (path?.length > 1) {
      if (layers.route && layers.routeGlow) {
        layers.routeGlow.setLatLngs(path);
        layers.route.setLatLngs(path);
      } else {
        if (layers.route) map.removeLayer(layers.route);
        if (layers.routeGlow) map.removeLayer(layers.routeGlow);
        layers.routeGlow = L.polyline(path, {
          color: "#34d399",
          weight: 12,
          opacity: 0.32,
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

    const pad = fitPadding || { padding: [48, 48] };
    const fitKey = `${pickupKey}|${destinationKey}|${pathKey}|${JSON.stringify(pad)}`;
    if (fitKey !== lastFitRef.current) {
      lastFitRef.current = fitKey;
      const bounds = [];
      if (pickup?.lat != null) bounds.push([pickup.lat, pickup.lng]);
      if (destination?.lat != null) bounds.push([destination.lat, destination.lng]);
      if (path?.length > 1) path.forEach((p) => bounds.push(p));
      else if (driver?.lat != null) bounds.push([driver.lat, driver.lng]);
      if (bounds.length > 1) {
        map.fitBounds(bounds, { maxZoom: 16, animate: false, ...pad });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 15, { animate: false });
      }
      map.invalidateSize({ animate: false });
    } else if (followRef.current && driver?.lat != null) {
      map.panTo([driver.lat, driver.lng], { animate: true, duration: 0.35 });
    }
  }, [pickupKey, destinationKey, driverKey, userKey, pathKey]);

  const cssHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#dfeae3] ${fill ? "h-full min-h-[46vh] rounded-none" : "rounded-2xl"}`}
      style={{ height: fill ? "100%" : cssHeight, minHeight: fill ? "46vh" : undefined, direction: "ltr" }}
    >
      <div ref={wrapRef} className="absolute inset-0 z-0" />
      {children ? <div className="absolute inset-0 z-10 pointer-events-none">{children}</div> : null}
    </div>
  );
}
