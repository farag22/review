const NOMINATIM = "https://nominatim.openstreetmap.org";
const PHOTON = "https://photon.komoot.io";
const OSRM = "https://router.project-osrm.org";

// Qalyubia Governorate search bounds. Nominatim uses west,north,east,south.
export const QALYUBIA_BBOX = { west: 30.90, south: 30.00, east: 31.55, north: 30.70 };
const QALYUBIA_VIEWBOX = [
  QALYUBIA_BBOX.west,
  QALYUBIA_BBOX.north,
  QALYUBIA_BBOX.east,
  QALYUBIA_BBOX.south,
].join(",");
const QALYUBIA_CONTEXT = "القليوبية، مصر";

export const BANHA = { lat: 30.466, lng: 31.185 };
export const BELBEIS = { lat: 30.4203, lng: 31.562 };
export const CAIRO = { lat: 30.0444, lng: 31.2357 };
export const DEFAULT_LOCATION = {
  lat: BANHA.lat,
  lng: BANHA.lng,
  label: "بنها، القليوبية",
  address: "بنها، محافظة القليوبية، مصر",
  fallback: true,
};

export const LOCAL_PLACES = [
  { label: "بنها", address: "بنها، القليوبية", lat: 30.466, lng: 31.185 },
  { label: "محطة بنها", address: "محطة السكة الحديد، بنها", lat: 30.4588, lng: 31.1786 },
  { label: "جامعة بنها", address: "جامعة بنها، القليوبية", lat: 30.457, lng: 31.184 },
  { label: "القناطر الخيرية", address: "القناطر الخيرية، القليوبية", lat: 30.193, lng: 31.137 },
  { label: "قها", address: "قها، القليوبية", lat: 30.283, lng: 31.204 },
  { label: "قليوب", address: "قليوب، القليوبية", lat: 30.179, lng: 31.205 },
  { label: "شبرا الخيمة", address: "شبرا الخيمة، القليوبية", lat: 30.1286, lng: 31.2422 },
  { label: "الخانكة", address: "الخانكة، القليوبية", lat: 30.2105, lng: 31.3684 },
  { label: "الخصوص", address: "الخصوص، القليوبية", lat: 30.164, lng: 31.315 },
  { label: "العبور", address: "مدينة العبور، القليوبية", lat: 30.228, lng: 31.481 },
  { label: "شبين القناطر", address: "شبين القناطر، القليوبية", lat: 30.312, lng: 31.321 },
  { label: "طوخ", address: "طوخ، القليوبية", lat: 30.353, lng: 31.201 },
  { label: "كفر شكر", address: "كفر شكر، القليوبية", lat: 30.547, lng: 31.267 },
  { label: "كفر الجزار", address: "كفر الجزار، بنها، القليوبية", lat: 30.444, lng: 31.178 },
  { label: "مرصفا", address: "مرصفا، بنها، القليوبية", lat: 30.404, lng: 31.193 },
  { label: "مشتهر", address: "مشتهر، طوخ، القليوبية", lat: 30.306, lng: 31.22 },
  { label: "أجهور الكبرى", address: "أجهور الكبرى، طوخ، القليوبية", lat: 30.315, lng: 31.116 },
  { label: "ميت كنانة", address: "ميت كنانة، طوخ، القليوبية", lat: 30.348, lng: 31.163 },
  { label: "نامول", address: "نامول، طوخ، القليوبية", lat: 30.337, lng: 31.264 },
  { label: "سنديون", address: "سنديون، قليوب، القليوبية", lat: 30.173, lng: 31.16 },
  { label: "باسوس", address: "باسوس، القناطر الخيرية، القليوبية", lat: 30.166, lng: 31.23 },
  { label: "أبو الغيط", address: "أبو الغيط، القناطر الخيرية، القليوبية", lat: 30.234, lng: 31.103 },
  { label: "الجبل الأصفر", address: "الجبل الأصفر، الخانكة، القليوبية", lat: 30.213, lng: 31.402 },
  { label: "بلبيس", address: "بلبيس، الشرقية", lat: 30.4203, lng: 31.562 },
  { label: "شارع بورسعيد، بلبيس", address: "شارع بورسعيد، بلبيس، الشرقية", lat: 30.418, lng: 31.559 },
  { label: "محطة بلبيس", address: "محطة السكة الحديد، بلبيس", lat: 30.4225, lng: 31.5638 },
  { label: "سوق بلبيس", address: "السوق، بلبيس، الشرقية", lat: 30.4192, lng: 31.5604 },
  { label: "المرج", address: "المرج، القاهرة", lat: 30.152, lng: 31.336 },
  { label: "مترو المرج", address: "محطة مترو المرج، القاهرة", lat: 30.1528, lng: 31.3355 },
  { label: "المرج الجديدة", address: "المرج الجديدة، القاهرة", lat: 30.163, lng: 31.348 },
  { label: "عين شمس", address: "عين شمس، القاهرة", lat: 30.131, lng: 31.327 },
  { label: "مدينة نصر", address: "مدينة نصر، القاهرة", lat: 30.0626, lng: 31.3219 },
  { label: "وسط البلد", address: "وسط القاهرة", lat: 30.0444, lng: 31.2357 },
  { label: "العباسية", address: "العباسية، القاهرة", lat: 30.065, lng: 31.277 },
  { label: "مصر الجديدة", address: "مصر الجديدة، القاهرة", lat: 30.087, lng: 31.324 },
];

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
  return `${n.toLocaleString("ar-EG", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} ج.م`;
}

export const RIDE_TYPE_LABELS = {
  economy: "اقتصادي",
  saver: "اقتصادي",
  comfort: "مريح",
  masseya: "ماسية",
  tuktuk: "توك توك",
  scooter: "سكوتر",
  motorcycle: "موتوسيكل",
  moto: "موتوسيكل",
};

export function rideTypeLabel(id, fallback) {
  const key = String(id || "").toLowerCase();
  return RIDE_TYPE_LABELS[key] || fallback || id || "";
}

export function minutesOnly(value) {
  let n = Number(value) || 0;
  if (!Number.isFinite(n) || n <= 0) return 1;
  if (n >= 24 * 60) n = Math.round(n / 60);
  return Math.max(1, Math.min(999, Math.round(n)));
}

export function formatMinutes(value) {
  return `${minutesOnly(value)} دقيقة`;
}

function jsonHeaders() {
  return { Accept: "application/json", "Accept-Language": "ar" };
}

async function fetchJson(url, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: jsonHeaders(), signal: ctrl.signal });
    if (!res.ok) throw new Error("تعذر جلب البيانات");
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function photonLabel(props = {}) {
  const parts = [
    props.name,
    props.street,
    props.district || props.suburb,
    props.city || props.town || props.village || props.county,
    props.state,
  ].filter(Boolean);
  return [...new Set(parts)].slice(0, 3).join("، ") || props.country || "موقع";
}

function photonPlace(feature) {
  const props = feature?.properties || {};
  const [lng, lat] = feature?.geometry?.coordinates || [];
  return {
    lat: Number(lat),
    lng: Number(lng),
    label: photonLabel(props),
    address: [props.name, props.street, props.city, props.state, props.country].filter(Boolean).join("، "),
  };
}

function coordLabel(lat, lng) {
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

export async function reverseGeocode(lat, lng) {
  try {
    const data = await fetchJson(`${PHOTON}/reverse?lat=${lat}&lon=${lng}&lang=ar`, 6000);
    const place = photonPlace(data?.features?.[0]);
    if (place?.lat) return { ...place, lat, lng };
  } catch {
    /* fallback */
  }
  try {
    const data = await fetchJson(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=ar`,
      6000
    );
    return {
      lat,
      lng,
      label: shortenAddress(data),
      address: data.display_name || "",
    };
  } catch {
    return {
      lat,
      lng,
      label: coordLabel(lat, lng),
      address: "",
    };
  }
}

function shortenAddress(data) {
  const a = data.address || {};
  const parts = [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village || a.state].filter(Boolean);
  return parts.slice(0, 3).join("، ") || data.display_name || "الموقع الحالي";
}

function normalizeSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

function inQalyubiaBbox(place) {
  const lat = Number(place?.lat);
  const lng = Number(place?.lng);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= QALYUBIA_BBOX.south &&
    lat <= QALYUBIA_BBOX.north &&
    lng >= QALYUBIA_BBOX.west &&
    lng <= QALYUBIA_BBOX.east
  );
}

function qalyubiaQuery(query) {
  const q = String(query || "").trim();
  if (/القليوبية|qalyubia|qalyub|egypt|مصر/i.test(q)) return q;
  return `${q}, ${QALYUBIA_CONTEXT}`;
}

export function searchLocalPlaces(query, limit = 8) {
  const q = normalizeSearch(query);
  if (!q) return LOCAL_PLACES.filter(inQalyubiaBbox).slice(0, limit);
  const scored = LOCAL_PLACES.filter(inQalyubiaBbox).map((place) => {
    const hay = normalizeSearch(`${place.label} ${place.address}`);
    let score = -1;
    if (hay === q) score = 100;
    else if (hay.startsWith(q)) score = 80;
    else if (hay.includes(q)) score = 60;
    return { place, score };
  })
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.place);
  return scored;
}

async function searchPhoton(q) {
  const params = new URLSearchParams({
    q: qalyubiaQuery(q),
    limit: "20",
    lang: "default",
    bbox: `${QALYUBIA_BBOX.west},${QALYUBIA_BBOX.south},${QALYUBIA_BBOX.east},${QALYUBIA_BBOX.north}`,
  });
  const data = await fetchJson(`${PHOTON}/api/?${params}`, 7000);
  return (data?.features || [])
    .map(photonPlace)
    .filter(inQalyubiaBbox);
}

async function searchNominatim(q) {
  const params = new URLSearchParams({
    q: qalyubiaQuery(q),
    format: "jsonv2",
    addressdetails: "1",
    limit: "20",
    "accept-language": "ar",
    countrycodes: "eg",
    viewbox: QALYUBIA_VIEWBOX,
    bounded: "1",
  });
  const rows = await fetchJson(`${NOMINATIM}/search?${params}`, 7000);
  return (rows || []).map((row) => ({
    lat: Number(row.lat),
    lng: Number(row.lon),
    label: row.name || shortenAddress(row),
    address: row.display_name,
  })).filter(inQalyubiaBbox);
}

function mergePlaces(remote, local) {
  const merged = [];
  const seen = new Set();
  [...remote, ...local].forEach((place) => {
    if (!Number.isFinite(place?.lat) || !Number.isFinite(place?.lng)) return;
    const key = `${place.lat.toFixed(4)},${place.lng.toFixed(4)}|${place.label || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(place);
  });
  return merged.slice(0, 12);
}

export async function searchPlaces(query) {
  const q = String(query || "").trim();
  if (q.length < 1) return [];
  const local = searchLocalPlaces(q);
  const settled = await Promise.allSettled([searchPhoton(q), searchNominatim(q)]);
  const remote = settled.flatMap((row) => (row.status === "fulfilled" ? row.value : []));
  return mergePlaces(remote, local);
}

export async function getRoute(from, to, extras = []) {
  const points = [from, ...extras, to].filter((p) => p && p.lat != null && p.lng != null);
  if (points.length < 2) return null;
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const data = await fetchJson(url, 6000);
    const route = data.routes?.[0];
    if (!route) return fallbackRoute(points);
    return {
      distanceKm: route.distance / 1000,
      durationMin: minutesOnly(route.duration / 60),
      path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    };
  } catch {
    return fallbackRoute(points);
  }
}

function fallbackRoute(points) {
  let distanceKm = 0;
  for (let i = 1; i < points.length; i += 1) {
    distanceKm += haversineKm(points[i - 1], points[i]);
  }
  return {
    distanceKm,
    durationMin: minutesOnly((distanceKm / 28) * 60),
    path: points.map((p) => [p.lat, p.lng]),
  };
}

export function geoErrorMessage(err) {
  const code = err?.code;
  if (code === 1) return "إذن الموقع مرفوض. فعّله من إعدادات المتصفح";
  if (code === 2) return "تعذر قراءة الموقع حالياً";
  if (code === 3) return "انتهت مهلة تحديد الموقع";
  if (typeof navigator === "undefined" || !navigator.geolocation) return "المتصفح لا يدعم تحديد الموقع";
  if (typeof window !== "undefined" && !window.isSecureContext) return "تحديد الموقع يتطلب HTTPS";
  return err?.message || "تعذر تحديد الموقع";
}

function readCoords(pos) {
  const lat = Number(pos?.coords?.latitude);
  const lng = Number(pos?.coords?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw Object.assign(new Error("إحداثيات غير صالحة"), { code: 2 });
  }
  return {
    lat,
    lng,
    accuracy: pos.coords.accuracy,
    heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
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
    return await getOnce({ enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
  } catch (err) {
    if (err?.code === 1) throw err;
    return getOnce({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  }
}

export function getCurrentPosition(options = {}) {
  return getCurrentCoords().catch(() =>
    getOnce({ enableHighAccuracy: true, timeout: options.timeout || 20000, maximumAge: 0 })
  );
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
        (pos) => {
          try {
            onOk(readCoords(pos));
          } catch {
            /* ignore bad sample */
          }
        },
        (err) => {
          if (err?.code === 1) onErr?.(err);
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
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
  motorcycle: {
    label: "موتوسيكل",
    base: 9,
    perKm: 3.1,
    perMin: 0.15,
    minFare: 11,
    shortKm: 5,
    shortPerKm: 2.35,
    etaBias: -1,
    cta: "اطلب موتوسيكل",
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
    label: "اقتصادي",
    base: 16,
    perKm: 5.25,
    perMin: 0.32,
    minFare: 20,
    etaBias: 2,
    cta: "اطلب اقتصادي",
  },
  masseya: {
    label: "ماسية",
    base: 19,
    perKm: 6.15,
    perMin: 0.4,
    minFare: 24,
    etaBias: 1,
    cta: "اطلب ماسية",
  },
  comfort: {
    label: "مريح",
    base: 24,
    perKm: 7.6,
    perMin: 0.5,
    minFare: 30,
    etaBias: -1,
    cta: "اطلب مريح",
  },
};

export function getFareProfile(rideType) {
  const id = String(rideType?.id || "").toLowerCase();
  const preset = FARE_PROFILES[id];
  if (preset) return { id, ...preset };
  return {
    id,
    label: rideTypeLabel(id, rideType?.label),
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
