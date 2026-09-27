import React from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton } from "../../components/ui";
import { CarBadge } from "../../components/Icons";
import MapView from "../../components/MapView";
import { useRide } from "../../context/RideContext";

export default function ChooseRide() {
  const navigate = useNavigate();
  const { rideOptions, selectedRide, setSelectedRide } = useRide();

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-4">
        <MapView height={170} />
      </div>
      <ScreenHeader title="اختر نوع الرحلة" subtitle="العروض متاحة الآن" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto px-5 space-y-2.5">
        {rideOptions.map((r) => {
          const active = selectedRide?.id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRide(r)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                active ? "border-brand-500 bg-brand-50" : "border-black/10 bg-white"
              }`}
            >
              <CarBadge />
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[14px]">{r.label}</p>
                  <span className="text-[11px] text-ink/45">{r.seats} 👤</span>
                </div>
                <p className="text-[12px] text-ink/45 mt-0.5">{r.eta} دقيقة، الآن وصل</p>
              </div>
              <p className="font-extrabold text-[14px]">{r.price.toLocaleString("ar-EG")} ج.م</p>
            </button>
          );
        })}
      </div>

      <div className="px-5 py-4 space-y-2 border-t border-black/5 bg-white">
        <button
          onClick={() => navigate("/wallet")}
          className="w-full flex items-center justify-between text-[13px] text-ink/60 py-1"
        >
          <span>طريقة الدفع</span>
          <span className="font-semibold text-ink">نقدًا ›</span>
        </button>
        <PrimaryButton
          disabled={!selectedRide}
          onClick={() => navigate("/confirm-ride")}
        >
          اختر الرحلة
        </PrimaryButton>
      </div>
    </div>
  );
}
