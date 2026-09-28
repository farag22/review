import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowIcon } from "../../components/ui";
import { ClockIcon, PaymentMethodIcon, RideTypeIcon } from "../../components/Icons";
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
  const {
    rideOptions,
    selectedRide,
    setSelectedRide,
    pickup,
    destination,
    route,
    paymentMethod,
  } = useRide();

  useEffect(() => {
    if (!selectedRide && rideOptions.length) setSelectedRide(rideOptions[0]);
  }, [rideOptions, selectedRide, setSelectedRide]);

  const tripHint = route
    ? `${formatDistance(route.distanceKm)} · ${route.durationMin} د`
    : "جاري حساب المسار...";

  return (
    <div className="ride-live">
      <div className="ride-live-map">
        <MapView
          fill
          height="100%"
          pickup={pickup}
          destination={destination}
          path={route?.path}
          fitPadding={{ paddingTopLeft: [36, 92], paddingBottomRight: [36, 390] }}
        />
      </div>

      <div className="absolute top-4 right-4 left-4 z-20 flex items-start justify-between pointer-events-none">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="sd-overlay-btn w-11 h-11 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
          aria-label="رجوع"
        >
          <span className="[&_path]:stroke-white">
            <ArrowIcon />
          </span>
        </button>
        <div className="max-w-[70%] rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <p className="text-white font-extrabold text-[13px] leading-5 truncate">
            {destination?.label || "اختر نوع الرحلة"}
          </p>
          <p className="text-white/55 text-[11px] mt-0.5">{tripHint}</p>
        </div>
      </div>

      <div className="ride-live-sheet">
        <div className="choose-ride-sheet rounded-t-[28px] border-t border-white/10 px-4 pt-3 pb-[calc(18px+env(safe-area-inset-bottom))]">
          <div className="flex justify-center pb-3">
            <span className="w-12 h-1.5 rounded-full bg-white/20" />
          </div>

          <div className="flex items-end justify-between px-1 mb-3">
            <p className="text-white font-extrabold text-[17px]">اختر الخدمة</p>
            <p className="text-white/45 text-[12px]">{rideOptions.length} خيارات</p>
          </div>

          <div className="max-h-[38vh] overflow-y-auto space-y-2.5 pr-0.5">
            {rideOptions.map((r) => {
              const active = selectedRide?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRide(r)}
                  className={`ride-option-card w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border transition-all duration-200 ${
                    active
                      ? "is-active border-emerald-400/80"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <RideTypeIcon type={r.id} size={50} active={active} />
                  <div className="flex-1 text-right min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-[15px] text-white truncate">{r.label}</p>
                      <span className="text-[11px] text-white/40 shrink-0">{r.seats} مقاعد</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-white/55">
                      <ClockIcon size={13} color="currentColor" />
                      <p className="text-[12px]">وصول تقريبي خلال {r.eta} د</p>
                    </div>
                  </div>
                  <p
                    className={`font-black text-[16px] tabular-nums shrink-0 ${
                      active ? "text-emerald-300" : "text-white"
                    }`}
                  >
                    {formatEgp(r.price)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/wallet")}
              className="h-14 px-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-center gap-2 shrink-0"
              aria-label="طريقة الدفع"
            >
              <span className="w-9 h-9 rounded-xl bg-emerald-400/15 flex items-center justify-center">
                <PaymentMethodIcon method={paymentMethod} size={16} color="#6ee7b7" />
              </span>
              <span className="text-[12px] font-bold text-white">
                {PAYMENT_LABELS[paymentMethod] || "نقدًا"}
              </span>
            </button>
            <button
              type="button"
              disabled={!selectedRide || !destination?.lat}
              onClick={() => navigate("/confirm-ride")}
              className="flex-1 h-14 rounded-2xl bg-emerald-500 text-slate-950 font-black text-[16px] shadow-[0_10px_28px_rgba(16,185,129,0.38)] active:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              اختر الخدمة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
