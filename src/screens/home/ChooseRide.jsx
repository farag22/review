import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowIcon } from "../../components/ui";
import { ClockIcon, PaymentMethodIcon, RideTypeIcon } from "../../components/Icons";
import MapView from "../../components/MapView";
import { useRide } from "../../context/RideContext";
import { formatDistance } from "../../lib/geo";

function badgeClass(type) {
  if (type === "fast") return "bg-emerald-400/20 text-emerald-200 border-emerald-300/25";
  if (type === "save") return "bg-amber-400/15 text-amber-200 border-amber-300/20";
  return "bg-sky-400/15 text-sky-200 border-sky-300/20";
}

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
  const cta = selectedRide?.cta || "اطلب الآن";

  return (
    <div className="ride-live">
      <div className="ride-live-map">
        <MapView
          fill
          height="100%"
          pickup={pickup}
          destination={destination}
          path={route?.path}
          routeInfo={route}
          showRecenter
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
        <div className="choose-ride-sheet rounded-t-[28px] border-t border-white/10 px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
          <div className="flex justify-center pb-3">
            <span className="w-12 h-1.5 rounded-full bg-white/20" />
          </div>

          <p className="text-white font-extrabold text-[16px] px-0.5 mb-2.5">خيارات التوصيل</p>

          <div className="max-h-[38vh] overflow-y-auto space-y-2">
            {rideOptions.map((r) => {
              const active = selectedRide?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRide(r)}
                  className={`ride-option-card w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border transition-all duration-200 ${
                    active ? "is-active border-emerald-400/80" : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <RideTypeIcon type={r.id} size={50} active={active} />
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-[15px] text-white truncate">{r.label}</p>
                      {r.badge ? (
                        <span
                          className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass(
                            r.badge.type
                          )}`}
                        >
                          {r.badge.text}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-white/50">
                      <ClockIcon size={12} color="currentColor" />
                      <span className="text-[12px]">وصول خلال {r.eta} د</span>
                    </div>
                  </div>
                  <div className="min-w-[78px] text-left shrink-0" dir="ltr">
                    <p
                      className={`font-black text-[20px] tabular-nums leading-none ${
                        active ? "text-emerald-300" : "text-white"
                      }`}
                    >
                      {Math.round(r.price)}
                    </p>
                    <p className="text-[11px] font-bold text-white/45 mt-1">ج.م</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3.5 flex items-stretch gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod(payId === "cash" ? "wallet" : "cash")}
              className="h-14 px-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-center gap-2 shrink-0"
              aria-label="طريقة الدفع"
            >
              <span className="w-9 h-9 rounded-xl bg-emerald-400/15 flex items-center justify-center">
                <PaymentMethodIcon method={payId} size={16} color="#6ee7b7" />
              </span>
              <span className="text-[12px] font-bold text-white">
                {payId === "wallet" ? "محفظة" : "نقدًا"}
              </span>
            </button>
            <button
              type="button"
              disabled={!selectedRide || !destination?.lat}
              onClick={() => navigate("/confirm-ride")}
              className="flex-1 h-14 rounded-2xl bg-emerald-500 text-slate-950 font-black text-[15px] shadow-[0_10px_28px_rgba(16,185,129,0.38)] active:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
