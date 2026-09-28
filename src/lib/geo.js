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

async function fetchJson(url, ms = 7000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: nominatimHeaders(), signal: ctrl.signal });
    if (!res.ok) throw new Error("تعذر جلب البيانات");
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=ar`;
  const data = await fetchJson(url);
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
  const rows = await fetchJson(`${NOMINATIM}/search?${params}`);
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

export function geoErrorMessage(err) {
  const code = err?.code;
  if (code === 1) return "إذن الموقع مرفوض. فعّله من إعدادات المتصفح ثم أعد المحاولة";
  if (code === 2) return "تعذر قراءة الموقع حالياً";
  if (code === 3) return "انتهت مهلة تحديد الموقع، أعد المحاولة";
  if (!navigator.geolocation) return "المتصفح لا يدعم تحديد الموقع";
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "تحديد الموقع يتطلب اتصالاً آمناً (HTTPS)";
  }
  return err?.message || "تعذر تحديد الموقع";
}

function readCoords(pos) {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
}

function getOnce(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error("المتصفح لا يدعم تحديد الموقع"), { code: 2 }));
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => resolve(readCoords(pos)), reject, options);
  });
}

export async function getCurrentCoords() {
  try {
    return await getOnce({ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
  } catch (err) {
    if (err?.code === 1) throw err;
    return getOnce({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }
}

export function watchPosition(onOk, onErr) {
  if (!navigator.geolocation) {
    onErr?.(Object.assign(new Error("المتصفح لا يدعم تحديد الموقع"), { code: 2 }));
    return () => {};
  }
  let cancelled = false;
  let watchId = null;

  getCurrentCoords()
    .then((coords) => {
      if (!cancelled) onOk(coords);
    })
    .catch((err) => {
      if (!cancelled) onErr?.(err);
    })
    .finally(() => {
      if (cancelled) return;
      watchId = navigator.geolocation.watchPosition(
        (pos) => onOk(readCoords(pos)),
        (err) => {
          if (err?.code !== 1) return;
          onErr?.(err);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 }
      );
    });

  return () => {
    cancelled = true;
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
  };
}

export const FARE_PROFILES = {
  scooter: {
    label: "سكوتر",
    base: 8,
    perKm: 2.85,
    perMin: 0.12,
    minFare: 10,
    shortKm: 4,
    shortPerKm: 2.15,
    etaBias: -1,
    cta: "اطلب سكوتر",
  },
  tuktuk: {
    label: "توك توك",
    base: 10,
    perKm: 3.45,
    perMin: 0.18,
    minFare: 12,
    shortKm: 5,
    shortPerKm: 2.55,
    etaBias: 0,
    cta: "اطلب توك توك",
  },
  economy: {
    label: "Saver",
    base: 16,
    perKm: 5.25,
    perMin: 0.32,
    minFare: 20,
    etaBias: 2,
    cta: "اطلب Saver",
  },
  masseya: {
    label: "Masseya",
    base: 19,
    perKm: 6.15,
    perMin: 0.4,
    minFare: 24,
    etaBias: 1,
    cta: "اطلب Masseya",
  },
  comfort: {
    label: "Comfort",
    base: 24,
    perKm: 7.6,
    perMin: 0.5,
    minFare: 30,
    etaBias: -1,
    cta: "اختر أولوية",
  },
};

export function getFareProfile(rideType) {
  const id = String(rideType?.id || "").toLowerCase();
  const preset = FARE_PROFILES[id];
  if (preset) return { id, ...preset };
  return {
    id,
    label: rideType?.label,
    base: Number(rideType?.base_fare) || 15,
    perKm: Number(rideType?.per_km) || 5,
    perMin: Number(rideType?.per_min) || 0.35,
    minFare: Number(rideType?.base_fare) || 15,
    etaBias: 0,
    cta: "اطلب الآن",
  };
}

export function calcFare(rideType, distanceKm, durationMin) {
  const profile = getFareProfile(rideType);
  const km = Math.max(0, Number(distanceKm) || 0);
  const mins = Math.max(0, Number(durationMin) || 0);
  let distanceCost = km * profile.perKm;
  if (profile.shortKm) {
    const shortKm = Math.min(km, profile.shortKm);
    distanceCost = shortKm * profile.shortPerKm + Math.max(0, km - profile.shortKm) * profile.perKm;
  }
  const raw = profile.base + distanceCost + mins * profile.perMin;
  return Math.max(profile.minFare, Math.round(raw));
}
