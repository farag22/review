import React from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon, HomeIcon, WorkIcon, PinIcon } from "../../components/Icons";
import MapView from "../../components/MapView";
import { useAuth } from "../../context/AuthContext";
import { useRide } from "../../context/RideContext";

const SERVICES = [
  { id: "economy", label: "سيارة" },
  { id: "scooter", label: "سكوتر" },
  { id: "tuktuk", label: "توك توك" },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pickup, locationError, refreshLocation, savedPlaces, rideOptions, setSelectedRide } = useRide();
  const name = user?.user_metadata?.full_name?.split(" ")[0] || "";
  const home = savedPlaces.find((p) => p.label === "home");
  const work = savedPlaces.find((p) => p.label === "work");

  function goWithType(typeId) {
    const option = rideOptions.find((r) => r.id === typeId);
    if (option) setSelectedRide(option);
    navigate("/set-destination");
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 flex items-center justify-between">
        <div>
          <p className="text-ink/50 text-[13px]">الموقع الحالي</p>
          <button type="button" onClick={refreshLocation} className="flex items-center gap-1.5 mt-0.5">
            <PinIcon size={16} />
            <p className="font-bold text-[15px]">
              {pickup?.label || (pickup?.lat ? `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}` : "جاري تحديد موقعك...")}
            </p>
          </button>
          {locationError ? (
            <button type="button" onClick={refreshLocation} className="text-red-500 text-[11px] mt-1 text-right">
              {locationError} · موقعي الحالي
            </button>
          ) : null}
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="w-11 h-11 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center"
        >
          {name ? name[0] : "ر"}
        </button>
      </div>

      <div className="px-5 mt-4">
        <MapView
          height={210}
          userLocation={pickup}
          showAccuracy
          showRecenter
          follow
          locate
          onLocate={refreshLocation}
        />
      </div>

      <button
        onClick={() => navigate("/set-destination")}
        className="mx-5 mt-4 h-14 rounded-2xl bg-white shadow-card px-4 flex items-center gap-3 text-ink/45"
      >
        <SearchIcon />
        <span className="text-[14px]">إلى أين تذهب؟</span>
      </button>

      <div className="px-5 mt-6">
        <p className="text-[13px] font-bold text-ink/60 mb-3">الأماكن المحفوظة</p>
        <div className="flex gap-3">
          <SavedPlace
            icon={<HomeIcon size={18} />}
            label={home?.name || "المنزل"}
            onClick={() => navigate("/set-destination", { state: { placeLabel: "home" } })}
          />
          <SavedPlace
            icon={<WorkIcon size={18} />}
            label={work?.name || "العمل"}
            onClick={() => navigate("/set-destination", { state: { placeLabel: "work" } })}
          />
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
              onClick={() => goWithType(s.id)}
              className="flex-1 h-16 rounded-2xl bg-white shadow-card flex flex-col items-center justify-center gap-1"
            >
              <span className="text-[12px] font-semibold">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6 pb-6">
        <div className="rounded-2xl bg-gradient-to-l from-brand-600 to-brand-400 p-5 text-white flex items-center justify-between overflow-hidden">
          <div>
            <p className="font-extrabold text-[15px]">احجز رحلتك الآن</p>
            <p className="text-white/80 text-[12px] mt-1">التسعير حسب المسافة الحقيقية من موقعك</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate("/set-destination")}
                className="bg-white text-brand-700 text-[12px] font-bold px-4 py-2 rounded-full"
              >
                احجز الآن
              </button>
              <button
                onClick={() => navigate("/schedule-ride")}
                className="bg-white/15 text-white text-[12px] font-bold px-4 py-2 rounded-full"
              >
                جدولة رحلة
              </button>
            </div>
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
      <span className="text-[12px] font-semibold text-ink/70 truncate w-full px-2">{label}</span>
    </button>
  );
}
