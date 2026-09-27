import React from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton } from "../../components/ui";
import { CarBadge } from "../../components/Icons";
import MapView from "../../components/MapView";
import { useRide } from "../../context/RideContext";
import { formatDistance, formatEgp } from "../../lib/geo";

const PAYMENT_LABELS = {
  cash: "نقدًا",
  wallet: "المحفظة",
  card: "بطاقة",
  bank: "تحويل بنكي",
};

export default function ChooseRide() {
  const navigate = useNavigate();
  const { rideOptions, selectedRide, setSelectedRide, pickup, destination, route, paymentMethod } = useRide();

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-4">
        <MapView height={170} pickup={pickup} destination={destination} path={route?.path} />
      </div>
      <ScreenHeader
        title="اختر نوع الرحلة"
        subtitle={
          route
            ? `${formatDistance(route.distanceKm)} · حوالي ${route.durationMin} د`
            : "جاري حساب المسافة..."
        }
        onBack={() => navigate(-1)}
      />

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
                  <span className="text-[11px] text-ink/45">{r.seats} مقاعد</span>
                </div>
                <p className="text-[12px] text-ink/45 mt-0.5">وصول تقريبي خلال {r.eta} د</p>
              </div>
              <p className="font-extrabold text-[14px]">{formatEgp(r.price)}</p>
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
          <span className="font-semibold text-ink">{PAYMENT_LABELS[paymentMethod] || "نقدًا"} ›</span>
        </button>
        <PrimaryButton
          disabled={!selectedRide || !destination?.lat}
          onClick={() => navigate("/confirm-ride")}
        >
          اختر الرحلة
        </PrimaryButton>
      </div>
    </div>
  );
}
