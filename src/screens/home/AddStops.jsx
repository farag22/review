import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton } from "../../components/ui";
import { PlusIcon, PinIcon } from "../../components/Icons";
import { useRide } from "../../context/RideContext";

const DURATIONS = ["5 د", "10 د", "30 د"];

export default function AddStops() {
  const navigate = useNavigate();
  const { stops, setStops } = useRide();
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState("10 د");

  function addStop() {
    if (!query.trim()) return;
    setStops([...stops, { label: query.trim(), duration }]);
    setQuery("");
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="إضافة توقفات" subtitle="أضف حتى 3 توقفات في الطريق" />
      <div className="px-5 space-y-3">
        <div className="rounded-xl bg-white border border-black/10 px-3 h-12 flex items-center gap-2">
          <PinIcon size={14} color="#0b7350" />
          <span className="text-[13px] text-ink/50">الشارع الرئيسي</span>
        </div>

        {stops.map((s, i) => (
          <div key={i} className="rounded-xl bg-brand-50 px-3 h-12 flex items-center gap-2">
            <PinIcon size={14} color="#0b7350" />
            <span className="text-[13px] flex-1">{s.label}</span>
            <span className="text-[11px] text-ink/45">{s.duration}</span>
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
          <button onClick={addStop} className="text-brand-600 text-[12px] font-bold">
            إضافة
          </button>
        </div>
      </div>

      <div className="px-5 mt-5">
        <p className="text-[13px] font-bold text-ink/60 mb-2">مدة التوقف</p>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`flex-1 h-11 rounded-xl text-[13px] font-semibold ${
                duration === d ? "bg-brand-600 text-white" : "bg-white border border-black/10"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-ink/40 mt-2">
          مدة التوقفات المضافة ستزيد على الوقت المقدر للرحلة
        </p>
      </div>

      <div className="flex-1" />
      <div className="px-5 py-4 space-y-2">
        <PrimaryButton onClick={() => navigate("/set-destination")}>إضافة توقف</PrimaryButton>
        <button
          onClick={() => navigate("/set-destination")}
          className="w-full text-center text-ink/50 text-[13px] py-2"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}
