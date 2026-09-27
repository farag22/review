import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../../components/MapView";
import { PhoneCallIcon, ChatIcon, ShieldIcon } from "../../components/Icons";
import { useRide } from "../../context/RideContext";

const PAYMENT_LABELS = {
  cash: "نقدًا",
  wallet: "المحفظة",
  card: "بطاقة",
  bank: "تحويل بنكي",
};

export default function TripProgress() {
  const navigate = useNavigate();
  const { pickup, destination, selectedRide, driver, route, paymentMethod, updateRideStatus, cancelRide } = useRide();
  const [error, setError] = useState("");

  const name = driver?.full_name || "السائق";
  const eta = route?.durationMin || selectedRide?.durationMin || 10;

  async function finishTrip() {
    setError("");
    try {
      await updateRideStatus("completed");
      navigate("/trip-completed");
    } catch (err) {
      setError(err.message || "تعذر إنهاء الرحلة");
    }
  }

  async function emergencyCancel() {
    await cancelRide();
    navigate("/home");
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative flex-1">
        <MapView height="100%" pickup={pickup} destination={destination} driver={driver} path={route?.path} />
      </div>

      <div className="bg-white rounded-t-3xl -mt-6 px-5 pt-5 pb-6 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-extrabold text-[15px]">جاري الرحلة الآن</p>
          <span className="text-[12px] text-ink/45">تصل خلال {eta} د</span>
        </div>

        <div className="rounded-2xl bg-sand p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700">
            {name[0]}
          </div>
          <div className="flex-1">
            <p className="font-bold text-[14px]">{name}</p>
            <p className="text-[12px] text-ink/50">
              {driver?.car_model || selectedRide?.label || "الرحلة"}
              {driver?.rating ? ` · ★ ${driver.rating}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {driver?.phone ? (
              <a
                href={`tel:${driver.phone}`}
                className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center"
              >
                <PhoneCallIcon size={16} />
              </a>
            ) : (
              <button className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center" disabled>
                <PhoneCallIcon size={16} />
              </button>
            )}
            <button className="w-10 h-10 rounded-full bg-sand border border-black/10 flex items-center justify-center" disabled>
              <ChatIcon size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <TripRow label="من" value={pickup?.label} color="#0b7350" />
          <TripRow label="إلى" value={destination?.label || "—"} color="#d9534f" />
          <div className="flex items-center justify-between text-[13px] text-ink/60 pt-1">
            <span>طريقة الدفع</span>
            <span className="font-semibold text-ink">{PAYMENT_LABELS[paymentMethod] || "نقدًا"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-ink/50 text-[12px]">
          <ShieldIcon size={16} />
          <span>مشاركة موقع رحلتك متاحة من زر الأمان</span>
        </div>

        {error && <p className="text-red-500 text-[13px]">{error}</p>}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={emergencyCancel}
            className="h-12 rounded-2xl border border-red-200 text-red-500 font-bold text-[13px]"
          >
            طوارئ
          </button>
          <button
            onClick={finishTrip}
            className="h-12 rounded-2xl bg-brand-600 text-white font-bold text-[13px]"
          >
            إنهاء الرحلة
          </button>
        </div>
      </div>
    </div>
  );
}

function TripRow({ label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <p className="text-[13px] flex-1">{value}</p>
      <span className="text-[11px] text-ink/40">{label}</span>
    </div>
  );
}
