import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowIcon } from "../../components/ui";
import { ClockIcon, PaymentMethodIcon, RideTypeIcon } from "../../components/Icons";
import MapView from "../../components/MapView";
import { useRide } from "../../context/RideContext";
import { formatDistance, formatEgp } from "../../lib/geo";

const QUICK_PAY = [
  { id: "cash", label: "نقدًا" },
  { id: "wallet", label: "محفظة" },
];

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
    setPaymentMethod,
  } = useRide();

  useEffect(() => {
    if (!selectedRide && rideOptions.length) setSelectedRide(rideOptions[0]);
  }, [rideOptions, selectedRide, setSelectedRide]);

  const tripHint = route
    ? `${formatDistance(route.distanceKm)} · ${route.durationMin} د`
    : "جاري حساب المسار...";
  const payId = paymentMethod === "wallet" ? "wallet" : "cash";

  return (
    <div className="ride-live">
      <div className="ride-live-map">
        <MapView
          fill
          height="100%"
          pickup={pickup}
          destination={destination}
          path={route?.path}
          fitPadding={{ paddingTopLeft: [36, 92], paddingBottomRight: [36, 360] }}
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
        <div className="choose-ride-sheet rounded-t-[28px] border-t border-white/10 px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
          <div className="flex justify-center pb-3">
            <span className="w-12 h-1.5 rounded-full bg-white/20" />
          </div>

          <p className="text-white font-extrabold text-[16px] px-0.5 mb-2.5">خيارات التوصيل</p>

          <div className="max-h-[36vh] overflow-y-auto divide-y divide-white/8 rounded-2xl bg-slate-900/55 backdrop-blur-md border border-white/10">
            {rideOptions.map((r) => {
              const active = selectedRide?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRide(r)}
                  className={`ride-option-row w-full flex items-center gap-3 px-3.5 py-3 text-right transition-colors ${
                    active ? "is-active bg-emerald-400/10" : "hover:bg-white/5"
                  }`}
                >
                  <RideTypeIcon type={r.id} size={46} active={active} />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-[14px] text-white truncate leading-5">{r.label}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-white/50">
                      <ClockIcon size={12} color="currentColor" />
                      <span className="text-[12px]">{r.eta} د</span>
                      <span className="text-white/20">·</span>
                      <span className="text-[12px]">{r.seats} مقاعد</span>
                    </div>
                  </div>
                  <p
                    className={`min-w-[72px] text-left font-black text-[17px] tabular-nums leading-none ${
                      active ? "text-emerald-300" : "text-white"
                    }`}
                    dir="ltr"
                  >
                    {formatEgp(r.price)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-3.5 flex items-stretch gap-2.5">
            <div className="h-14 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 p-1 flex items-center shrink-0">
              {QUICK_PAY.map((opt) => {
                const on = payId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`h-full px-2.5 rounded-xl flex items-center gap-1.5 transition-colors ${
                      on ? "bg-emerald-400/20 text-emerald-200" : "text-white/55"
                    }`}
                    aria-pressed={on}
                  >
                    <PaymentMethodIcon
                      method={opt.id}
                      size={14}
                      color={on ? "#6ee7b7" : "rgba(255,255,255,0.55)"}
                    />
                    <span className="text-[12px] font-bold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!selectedRide || !destination?.lat}
              onClick={() => navigate("/confirm-ride")}
              className="flex-1 h-14 rounded-2xl bg-emerald-500 text-slate-950 font-black text-[16px] shadow-[0_10px_28px_rgba(16,185,129,0.38)] active:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              اطلب الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
