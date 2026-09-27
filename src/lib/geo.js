const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";

export const BANHA = { lat: 30.466, lng: 31.185 };

export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return 0;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

export function formatEgp(amount) {
  const n = Number(amount) || 0;
  return `${n.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م`;
}

function nominatimHeaders() {
  return { Accept: "application/json" };
}

export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=ar`;
  const res = await fetch(url, { headers: nominatimHeaders() });
  if (!res.ok) throw new Error("تعذر تحديد العنوان");
  const data = await res.json();
  return {
    lat,
    lng,
    label: shortenAddress(data),
    address: data.display_name || "",
  };
}

function shortenAddress(data) {
  const a = data.address || {};
  const parts = [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village || a.state]
    .filter(Boolean);
  return parts.slice(0, 3).join("، ") || data.display_name || "الموقع الحالي";
}

export async function searchPlaces(query, { lat, lng } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
    countrycodes: "eg",
    "accept-language": "ar",
  });
  if (lat != null && lng != null) {
    params.set("viewbox", `${lng - 0.35},${lat + 0.35},${lng + 0.35},${lat - 0.35}`);
    params.set("bounded", "0");
  }
  const res = await fetch(`${NOMINATIM}/search?${params}`, { headers: nominatimHeaders() });
  if (!res.ok) throw new Error("تعذر البحث عن الأماكن");
  const rows = await res.json();
  return rows.map((row) => ({
    lat: Number(row.lat),
    lng: Number(row.lon),
    label: row.name || shortenAddress(row),
    address: row.display_name,
  }));
}

export async function getRoute(from, to, extras = []) {
  const points = [from, ...extras, to].filter((p) => p && p.lat != null && p.lng != null);
  if (points.length < 2) return null;
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) return fallbackRoute(points);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) return fallbackRoute(points);
  return {
    distanceKm: route.distance / 1000,
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}

function fallbackRoute(points) {
  let distanceKm = 0;
  for (let i = 1; i < points.length; i += 1) {
    distanceKm += haversineKm(points[i - 1], points[i]);
  }
  return {
    distanceKm,
    durationMin: Math.max(1, Math.round((distanceKm / 28) * 60)),
    path: points.map((p) => [p.lat, p.lng]),
  };
}

export function watchPosition(onOk, onErr) {
  if (!navigator.geolocation) {
    onErr?.(new Error("المتصفح لا يدعم تحديد الموقع"));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      onOk({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    },
    onErr,
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 8000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

export function calcFare(rideType, distanceKm, durationMin) {
  const base = Number(rideType?.base_fare) || 10;
  const perKm = Number(rideType?.per_km) || 5;
  const perMin = Number(rideType?.per_min) || 0.4;
  const raw = base + perKm * distanceKm + perMin * durationMin;
  return Math.max(base, Math.round(raw));
}
