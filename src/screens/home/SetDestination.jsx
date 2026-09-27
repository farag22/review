import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton, Chip } from "../../components/ui";
import { PinIcon, SearchIcon, ClockIcon, PlusIcon } from "../../components/Icons";
import { useRide } from "../../context/RideContext";

const PLACES = [
  { name: "جامعة بنها", address: "شارع الجيش، بنها" },
  { name: "مستشفى بنها التعليمي", address: "بنها، القليوبية" },
  { name: "مول العبور", address: "مدينة العبور" },
  { name: "محطة قطار بنها", address: "وسط البلد، بنها" },
];

export default function SetDestination() {
  const navigate = useNavigate();
  const { destination, setDestination, stops, setStops } = useRide();
  const [query, setQuery] = useState(destination?.label || "");
  const [tab, setTab] = useState("home");

  const filtered = query
    ? PLACES.filter((p) => p.name.includes(query) || p.address.includes(query))
    : PLACES;

  function pick(place) {
    setDestination({ label: place.name, address: place.address });
    navigate("/choose-ride");
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="تحديد الوجهة" />
      <div className="px-5 space-y-3">
        <div className="h-12 rounded-xl bg-white border border-black/10 px-3 flex items-center gap-2">
          <PinIcon size={14} color="#0b7350" />
          <span className="text-[13px] text-ink/60">الموقع الحالي</span>
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

      <div className="px-5 mt-5 flex gap-2">
        <Chip active={tab === "home"} onClick={() => setTab("home")}>المنزل</Chip>
        <Chip active={tab === "work"} onClick={() => setTab("work")}>العمل</Chip>
        <Chip active={tab === "fav"} onClick={() => setTab("fav")}>المفضلة</Chip>
      </div>

      <div className="flex-1 overflow-y-auto px-5 mt-4 space-y-1">
        {filtered.map((p) => (
          <button
            key={p.name}
            onClick={() => pick(p)}
            className="w-full flex items-center gap-3 py-3 border-b border-black/5 text-right"
          >
            <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
              <ClockIcon size={16} color="#0b7350" />
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
          disabled={!destination}
          onClick={() => navigate("/choose-ride")}
        >
          تأكيد الوجهة
        </PrimaryButton>
      </div>
    </div>
  );
}
