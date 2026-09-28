import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../../components/MapView";
import RideLiveOverlay from "../../components/RideLiveOverlay";
import { PrimaryButton } from "../../components/ui";
import { useCaptain } from "../../context/CaptainContext";
import { formatDistance, formatEgp, haversineKm } from "../../lib/geo";

const STEPS = [
  { status: "accepted", label: "الوصول لموقع الراكب", next: "arrived" },
  { status: "arrived", label: "بدء الرحلة", next: "in_progress" },
  { status: "in_progress", label: "إنهاء الرحلة", next: "completed" },
];

export default function CaptainActiveRide() {
  const navigate = useNavigate();
  const { driver, location, activeRide, route, riderProfile, updateActiveStatus } = useCaptain();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const pickup = useMemo(
    () =>
      activeRide
        ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng, label: activeRide.pickup_address }
        : null,
    [activeRide?.id, activeRide?.pickup_lat, activeRide?.pickup_lng, activeRide?.pickup_address]
  );
  const destination = useMemo(
    () =>
      activeRide
        ? { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng, label: activeRide.dropoff_address }
        : null,
    [activeRide?.id, activeRide?.dropoff_lat, activeRide?.dropoff_lng, activeRide?.dropoff_address]
  );

  if (!activeRide && !done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="font-bold">لا توجد رحلة نشطة</p>
        <button
          onClick={() => navigate("/captain/dashboard")}
          className="text-brand-600 font-bold text-[14px]"
        >
          العودة للوحة التحكم
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex-1 flex flex-col px-6 pt-14">
        <p className="text-brand-600 text-[13px] font-bold">اكتملت الرحلة</p>
        <h1 className="text-2xl font-extrabold mt-1">تم إنهاء الرحلة</h1>
        <div className="mt-8 rounded-2xl bg-white shadow-card p-5 space-y-3">
          <Row label="المسافة" value={formatDistance(Number(done.distance_km) || 0)} />
          <Row label="المدة" value={`${done.duration_min || 0} د`} />
          <Row label="التكلفة" value={formatEgp(done.fare)} />
          <Row label="الدفع" value={done.payment_method === "cash" ? "نقدًا" : done.payment_method} />
        </div>
        <div className="flex-1" />
        <PrimaryButton className="mb-6" onClick={() => navigate("/captain/dashboard")}>
          العودة للطلبات
        </PrimaryButton>
      </div>
    );
  }

  const step = STEPS.find((s) => s.status === activeRide.status) || STEPS[0];
  const remainingKm =
    activeRide.status === "in_progress"
      ? haversineKm(location, destination)
      : haversineKm(location, pickup);
  const riderPhone = riderProfile?.phone;

  async function handleNext() {
    setError("");
    setBusy(true);
    try {
      const result = await updateActiveStatus(step.next);
      if (step.next === "completed") setDone(result);
    } catch (err) {
      setError(err.message || "تعذر تحديث حالة الرحلة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ride-live">
      <div className="ride-live-map">
        <MapView
          fill
          follow
          height="100%"
          pickup={pickup}
          destination={destination}
          driver={location}
          path={route?.path}
        />
      </div>

      <RideLiveOverlay
        badge="تتبع مباشر"
        phone={riderPhone}
        chatTitle="مراسلة الراكب"
        chatBody="التتبع يعمل الآن. الدردشة تظهر فوق الخريطة طوال سير الرحلة."
      />

      <div className="ride-live-sheet bg-white rounded-t-3xl px-5 pt-5 pb-6 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] space-y-4">
        <div className="w-10 h-1 rounded-full bg-black/10 mx-auto -mt-1" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-extrabold text-[16px]">{stepTitle(activeRide.status)}</p>
            <p className="text-[12px] text-ink/50 mt-0.5">
              {formatDistance(remainingKm)} متبقية · {route?.durationMin || activeRide.duration_min || "—"} د
            </p>
          </div>
          <span className="text-brand-700 font-extrabold">{formatEgp(activeRide.fare)}</span>
        </div>

        <div className="rounded-2xl bg-sand p-3 space-y-2">
          <TripRow label="من" value={activeRide.pickup_address || "نقطة الانطلاق"} color="#0b7350" />
          <TripRow label="إلى" value={activeRide.dropoff_address || "الوجهة"} color="#d9534f" />
        </div>

        <div className="flex items-center justify-between text-[12px] text-ink/55">
          <span>{driver?.car_model} · {driver?.plate_number}</span>
          <span>{activeRide.payment_method === "cash" ? "نقدًا" : activeRide.payment_method}</span>
        </div>

        {error && <p className="text-red-500 text-[13px]">{error}</p>}

        <PrimaryButton onClick={handleNext} disabled={busy}>
          {busy ? "جاري التحديث..." : step.label}
        </PrimaryButton>

        <button
          onClick={() => navigate("/captain/dashboard")}
          className="w-full text-center text-[12px] text-ink/40"
        >
          العودة للوحة التحكم
        </button>
      </div>
    </div>
  );
}

function stepTitle(status) {
  if (status === "accepted") return "توجه إلى موقع الراكب";
  if (status === "arrived") return "وصلت — بانتظار بدء الرحلة";
  if (status === "in_progress") return "الرحلة جارية نحو الوجهة";
  return "رحلة نشطة";
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

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-[14px]">
      <span className="text-ink/50">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
