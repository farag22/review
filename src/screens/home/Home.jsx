import React from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon, HomeIcon, WorkIcon, PinIcon } from "../../components/Icons";
import { useAuth } from "../../context/AuthContext";

const SERVICES = [
  { id: "car", label: "سيارة" },
  { id: "bike", label: "دراجة" },
  { id: "tuktuk", label: "توك توك" },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name?.split(" ")[0] || "";

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 flex items-center justify-between">
        <div>
          <p className="text-ink/50 text-[13px]">الموقع الحالي</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <PinIcon size={16} />
            <p className="font-bold text-[15px]">بنها، القليوبية</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/wallet")}
          className="w-11 h-11 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center"
        >
          {name ? name[0] : "ر"}
        </button>
      </div>

      <button
        onClick={() => navigate("/set-destination")}
        className="mx-5 mt-5 h-14 rounded-2xl bg-white shadow-card px-4 flex items-center gap-3 text-ink/45"
      >
        <SearchIcon />
        <span className="text-[14px]">إلى أين تذهب؟</span>
      </button>

      <div className="px-5 mt-6">
        <p className="text-[13px] font-bold text-ink/60 mb-3">الأماكن المحفوظة</p>
        <div className="flex gap-3">
          <SavedPlace icon={<HomeIcon size={18} />} label="المنزل" onClick={() => navigate("/set-destination")} />
          <SavedPlace icon={<WorkIcon size={18} />} label="العمل" onClick={() => navigate("/set-destination")} />
          <SavedPlace
            icon={<span className="text-brand-600 font-bold">+</span>}
            label="إضافة"
            onClick={() => navigate("/set-destination")}
          />
        </div>
      </div>

      <div className="px-5 mt-6">
        <p className="text-[13px] font-bold text-ink/60 mb-3">الخدمات</p>
        <div className="flex gap-3">
          {SERVICES.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate("/set-destination")}
              className="flex-1 h-16 rounded-2xl bg-white shadow-card flex flex-col items-center justify-center gap-1"
            >
              <span className="text-[12px] font-semibold">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6">
        <div className="rounded-2xl bg-gradient-to-l from-brand-600 to-brand-400 p-5 text-white flex items-center justify-between overflow-hidden">
          <div>
            <p className="font-extrabold text-[15px]">خصم 20% على أول رحلة</p>
            <p className="text-white/80 text-[12px] mt-1">احجز رحلتك الأولى دلوقتي</p>
            <button
              onClick={() => navigate("/set-destination")}
              className="mt-3 bg-white text-brand-700 text-[12px] font-bold px-4 py-2 rounded-full"
            >
              احجز الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SavedPlace({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-20 rounded-2xl bg-white shadow-card flex flex-col items-center justify-center gap-1.5"
    >
      {icon}
      <span className="text-[12px] font-semibold text-ink/70">{label}</span>
    </button>
  );
}
