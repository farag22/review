import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = "&copy; OpenStreetMap";

function divIcon(color, label) {
  return L.divIcon({
    className: "sd-marker",
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:#fff;font:700 11px Cairo,sans-serif">${label || ""}</span>
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
  children,
}) {
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ markers: L.layerGroup(), route: null });

  useEffect(() => {
    if (!wrapRef.current || mapRef.current) return undefined;
    const center = userLocation || pickup || { lat: 30.466, lng: 31.185 };
    const map = L.map(wrapRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([center.lat, center.lng], 14);
    L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 }).addTo(map);
    layersRef.current.markers.addTo(map);
    mapRef.current = map;
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    setTimeout(onResize, 80);
    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { markers } = layersRef.current;
    markers.clearLayers();
    const bounds = [];

    function add(point, color, label) {
      if (!point || point.lat == null) return;
      L.marker([point.lat, point.lng], { icon: divIcon(color, label) }).addTo(markers);
      bounds.push([point.lat, point.lng]);
    }

    add(userLocation || pickup, "#0b7350", "أ");
    add(destination, "#d9534f", "ب");
    add(driver, "#1d4ed8", "س");

    if (layersRef.current.route) {
      map.removeLayer(layersRef.current.route);
      layersRef.current.route = null;
    }
    if (path?.length > 1) {
      const line = L.polyline(path, { color: "#0b7350", weight: 4, opacity: 0.85 }).addTo(map);
      layersRef.current.route = line;
      line.getLatLngs().forEach((ll) => bounds.push([ll.lat, ll.lng]));
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }
    map.invalidateSize();
  }, [pickup, destination, driver, path, userLocation]);

  const cssHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-[#dfeae3]" style={{ height: cssHeight, direction: "ltr" }}>
      <div ref={wrapRef} className="absolute inset-0 z-0" />
      {children ? <div className="absolute inset-0 z-10 pointer-events-none">{children}</div> : null}
    </div>
  );
}
