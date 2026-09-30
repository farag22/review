import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton, Chip } from "../../components/ui";
import { PinIcon, SearchIcon, ClockIcon, PlusIcon } from "../../components/Icons";
import MapView from "../../components/MapView";
import { useRide } from "../../context/RideContext";
import { LOCAL_PLACES, formatDistance, reverseGeocode, searchLocalPlaces, searchPlaces } from "../../lib/geo";

export default function SetDestination() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pickup, setPickup, destination, setDestination, stops, savedPlaces, savePlace, route } = useRide();
  const [query, setQuery] = useState(destination?.label || "");
  const [tab, setTab] = useState(location.state?.placeLabel || "fav");
  const [results, setResults] = useState(LOCAL_PLACES.slice(0, 8));
  const [mode, setMode] = useState("dropoff");
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    setResults(q ? searchLocalPlaces(q) : LOCAL_PLACES.slice(0, 8));
    if (q.length < 1) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const rows = await searchPlaces(q, pickup);
        if (cancelled) return;
        const safeRows = Array.isArray(rows) ? rows : [];
        if (safeRows.length) {
          setResults(safeRows);
        } else {
          setResults([
            { label: q, address: "منطقة رئيسية، مصر", lat: pickup?.lat || 30.466, lng: pickup?.lng || 31.185 },
          ]);
        }
      } catch {
        if (cancelled) return;
        const local = searchLocalPlaces(q);
        setResults(
          local.length
            ? local
            : [{ label: q, address: "القليوبية / مصر", lat: pickup?.lat || 30.466, lng: pickup?.lng || 31.185 }]
        );
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, pickup]);

  async function applyMapPoint(coords, kind) {
    setPinBusy(true);
    try {
      const place = await reverseGeocode(coords.lat, coords.lng);
      const next = { ...place, lat: coords.lat, lng: coords.lng, manual: true };
      if (kind === "pickup") {
        setPickup(next);
        setMode("dropoff");
      } else {
        setDestination(next);
        setQuery(next.label || "");
      }
    } finally {
      setPinBusy(false);
    }
  }

  function pick(place) {
    setDestination({ ...place, manual: true });
    setQuery(place.label || "");
  }

  async function pickAndSave(place, label) {
    await savePlace({ label, place });
    pick(place);
  }

  const filteredSaved = savedPlaces.filter((p) => {
    if (tab === "home") return p.label === "home";
    if (tab === "work") return p.label === "work";
    return true;
  });

  const tripHint = useMemo(() => {
    if (!route) return pinBusy ? "جاري تحديد الموقع..." : "اضغط على الخريطة لتحديد النقطة";
    return `${formatDistance(route.distanceKm)} · ${route.durationMin} د`;
  }, [route, pinBusy]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScreenHeader title="تحديد الوجهة" subtitle={tripHint} />

      <div className="px-5">
        <MapView
          height={250}
          pickup={pickup}
          destination={destination}
          userLocation={pickup?.manual ? null : pickup}
          path={route?.path}
          showAccuracy
          showRecenter
          interactive
          routeInfo={route}
          onMapClick={(pt) => applyMapPoint(pt, mode)}
          onPickupDrag={(pt) => applyMapPoint(pt, "pickup")}
          onDestinationDrag={(pt) => applyMapPoint(pt, "dropoff")}
        />
      </div>

      <div className="px-5 mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("pickup")}
          className={`flex-1 h-10 rounded-xl text-[12px] font-bold border ${
            mode === "pickup" ? "bg-emerald-600 text-white border-emerald-500" : "bg-white text-ink border-black/10"
          }`}
        >
          تحديد الانطلاق
        </button>
        <button
          type="button"
          onClick={() => setMode("dropoff")}
          className={`flex-1 h-10 rounded-xl text-[12px] font-bold border ${
            mode === "dropoff" ? "bg-emerald-600 text-white border-emerald-500" : "bg-white text-ink border-black/10"
          }`}
        >
          تحديد الوصول
        </button>
      </div>

      <div className="px-5 mt-3 space-y-3">
        <div className="h-12 rounded-xl bg-white border border-black/10 px-3 flex items-center gap-2">
          <PinIcon size={14} color="#0b7350" />
          <span className="text-[13px] text-ink/60 truncate">{pickup?.label || "بنها، القليوبية"}</span>
        </div>
        <div className="h-12 rounded-xl bg-brand-50 border border-brand-100 px-3 flex items-center gap-2">
          <SearchIcon size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="إلى أين تذهب؟"
            className="flex-1 bg-transparent text-[14px] placeholder:text-ink/40"
          />
        </div>
        {stops.length > 0 && (
          <p className="text-[12px] text-ink/50">{stops.length} توقف إضافي</p>
        )}
        <button
          onClick={() => navigate("/add-stops")}
          className="text-brand-600 text-[13px] font-bold flex items-center gap-1"
        >
          <PlusIcon size={16} /> إضافة توقف
        </button>
      </div>

      <div className="px-5 mt-4 flex gap-2">
        <Chip active={tab === "home"} onClick={() => setTab("home")}>المنزل</Chip>
        <Chip active={tab === "work"} onClick={() => setTab("work")}>العمل</Chip>
        <Chip active={tab === "fav"} onClick={() => setTab("fav")}>المفضلة</Chip>
      </div>

      <div className="flex-1 overflow-y-auto px-5 mt-3 space-y-1">
        {results.map((p) => (
          <button
            key={`${p.lat}-${p.lng}-${p.label}`}
            onClick={() => pick(p)}
            className="w-full flex items-center gap-3 py-3 border-b border-black/5 text-right"
          >
            <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
              <ClockIcon size={16} color="#0b7350" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold">{p.label}</p>
              <p className="text-[12px] text-ink/45">{p.address}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pickAndSave(p, tab === "work" ? "work" : tab === "home" ? "home" : "favorite");
              }}
              className="text-[11px] text-brand-600 font-bold"
            >
              حفظ
            </button>
          </button>
        ))}
        {!query.trim() && filteredSaved.map((p) => (
          <button
            key={p.id}
            onClick={() => pick({ label: p.name, address: p.address, lat: p.lat, lng: p.lng })}
            className="w-full flex items-center gap-3 py-3 border-b border-black/5 text-right"
          >
            <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
              <PinIcon size={16} />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold">{p.name}</p>
              <p className="text-[12px] text-ink/45">{p.address}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="px-5 py-4">
        <PrimaryButton
          disabled={!destination?.lat}
          onClick={() => navigate("/choose-ride")}
        >
          تأكيد الوجهة
        </PrimaryButton>
      </div>
    </div>
  );
}
