import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton } from "../../components/ui";
import { PlusIcon, PinIcon } from "../../components/Icons";
import { useRide } from "../../context/RideContext";
import { searchLocalPlaces, searchPlaces } from "../../lib/geo";

const DURATIONS = [
  { label: "5 د", minutes: 5 },
  { label: "10 د", minutes: 10 },
  { label: "30 د", minutes: 30 },
];

export default function AddStops() {
  const navigate = useNavigate();
  const { pickup, stops, setStops } = useRide();
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState(DURATIONS[1]);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return undefined;
    }
    setResults(searchLocalPlaces(q));
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const rows = await searchPlaces(q, pickup);
        if (!cancelled && rows?.length) setResults(rows);
      } catch {
        if (!cancelled) setResults(searchLocalPlaces(q));
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, pickup]);

  function addStop(place) {
    if (stops.length >= 3) return;
    setStops([
      ...stops,
      {
        label: place.label,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        duration: duration.label,
        waitMinutes: duration.minutes,
      },
    ]);
    setQuery("");
    setResults([]);
  }

  function removeStop(index) {
    setStops(stops.filter((_, i) => i !== index));
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="إضافة توقفات" subtitle="أضف حتى 3 توقفات في الطريق" />
      <div className="px-5 space-y-3">
        <div className="rounded-xl bg-white border border-black/10 px-3 h-12 flex items-center gap-2">
          <PinIcon size={14} color="#0b7350" />
          <span className="text-[13px] text-ink/50 truncate">{pickup?.label || "نقطة الانطلاق"}</span>
        </div>

        {stops.map((s, i) => (
          <div key={`${s.lat}-${s.lng}-${i}`} className="rounded-xl bg-brand-50 px-3 h-12 flex items-center gap-2">
            <PinIcon size={14} color="#0b7350" />
            <span className="text-[13px] flex-1 truncate">{s.label}</span>
            <span className="text-[11px] text-ink/45">{s.duration}</span>
            <button onClick={() => removeStop(i)} className="text-red-500 text-[11px] font-bold">حذف</button>
          </div>
        ))}

        <div className="rounded-xl bg-white border border-dashed border-black/15 px-3 h-12 flex items-center gap-2">
          <PlusIcon size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="أين التوقف؟"
            className="flex-1 bg-transparent text-[13px] placeholder:text-ink/40"
          />
        </div>
        {results.map((p) => (
          <button
            key={`${p.lat}-${p.lng}`}
            onClick={() => addStop(p)}
            className="w-full text-right rounded-xl bg-white border border-black/5 px-3 py-2"
          >
            <p className="text-[13px] font-semibold">{p.label}</p>
            <p className="text-[11px] text-ink/45">{p.address}</p>
          </button>
        ))}
      </div>

      <div className="px-5 mt-5">
        <p className="text-[13px] font-bold text-ink/60 mb-2">مدة التوقف</p>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.label}
              onClick={() => setDuration(d)}
              className={`flex-1 h-11 rounded-xl text-[13px] font-semibold ${
                duration.label === d.label ? "bg-brand-600 text-white" : "bg-white border border-black/10"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-ink/40 mt-2">
          مدة التوقفات المضافة ستزيد على الوقت المقدر للرحلة
        </p>
      </div>

      <div className="flex-1" />
      <div className="px-5 py-4 space-y-2">
        <PrimaryButton onClick={() => navigate("/set-destination")}>حفظ التوقفات</PrimaryButton>
        <button
          onClick={() => navigate("/set-destination")}
          className="w-full text-center text-ink/50 text-[13px] py-2"
        >
          رجوع
        </button>
      </div>
    </div>
  );
}
