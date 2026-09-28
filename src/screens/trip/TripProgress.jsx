import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../../components/MapView";
import RideLiveOverlay from "../../components/RideLiveOverlay";
import { ShieldIcon } from "../../components/Icons";
import { useRide } from "../../context/RideContext";
import { supabase } from "../../lib/supabase";

const PAYMENT_LABELS = {
  cash: "نقدًا",
  wallet: "المحفظة",
  card: "بطاقة",
  bank: "تحويل بنكي",
};

export default function TripProgress() {
  const navigate = useNavigate();
  const {
    pickup,
    destination,
    selectedRide,
    driver,
    route,
    paymentMethod,
    activeRide,
    refreshDriver,
    updateRideStatus,
    cancelRide,
    setActiveRide,
  } = useRide();
  const [error, setError] = useState("");

  useEffect(() => {
    const driverId = activeRide?.driver_id || driver?.id;
    if (!driverId) return undefined;

    refreshDriver(driverId);
    const poll = setInterval(() => refreshDriver(driverId), 4000);
    const channel = supabase
      .channel(`driver-track-${driverId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drivers", filter: `id=eq.${driverId}` },
        (payload) => {
          if (payload.new) refreshDriver(driverId);
        }
      )
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [activeRide?.driver_id, driver?.id, refreshDriver]);

  useEffect(() => {
    const rideId = activeRide?.id;
    if (!rideId) return undefined;
    const channel = supabase
      .channel(`progress-ride-${rideId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => {
          const ride = payload.new;
          if (!ride) return;
          setActiveRide(ride);
          if (ride.status === "completed") navigate("/trip-completed");
        }
      )
      .subscribe();
    const poll = setInterval(async () => {
      const { data } = await supabase.from("rides").select("*").eq("id", rideId).maybeSingle();
      if (data?.status === "completed") {
        setActiveRide(data);
        navigate("/trip-completed");
      }
    }, 4000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [activeRide?.id, navigate, setActiveRide]);

  const mapPickup = useMemo(
    () =>
      activeRide?.pickup_lat != null
        ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng, label: activeRide.pickup_address }
        : pickup,
    [activeRide?.pickup_lat, activeRide?.pickup_lng, activeRide?.pickup_address, pickup]
  );
  const mapDestination = useMemo(
    () =>
      activeRide?.dropoff_lat != null
        ? { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng, label: activeRide.dropoff_address }
        : destination,
    [activeRide?.dropoff_lat, activeRide?.dropoff_lng, activeRide?.dropoff_address, destination]
  );

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
    <div className="ride-live">
      <div className="ride-live-map">
        <MapView
          fill
          follow
          height="100%"
          pickup={mapPickup}
          destination={mapDestination}
          driver={driver}
          path={route?.path}
        />
      </div>

      <RideLiveOverlay
        badge="تتبع السائق"
        phone={driver?.phone}
        chatTitle="مراسلة السائق"
        chatBody="يمكنك التواصل أثناء التتبع المباشر على الخريطة حتى إنهاء الرحلة."
      />

      <div className="ride-live-sheet bg-white rounded-t-3xl px-5 pt-5 pb-6 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] space-y-4">
        <div className="w-10 h-1 rounded-full bg-black/10 mx-auto -mt-1" />
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
        </div>

        <div className="space-y-2">
          <TripRow label="من" value={mapPickup?.label || pickup?.label} color="#0b7350" />
          <TripRow label="إلى" value={mapDestination?.label || destination?.label || "—"} color="#d9534f" />
          <div className="flex items-center justify-between text-[13px] text-ink/60 pt-1">
            <span>طريقة الدفع</span>
            <span className="font-semibold text-ink">{PAYMENT_LABELS[paymentMethod] || "نقدًا"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-ink/50 text-[12px]">
          <ShieldIcon size={16} />
          <span>موقع الرحلة يظهر مباشرة على الخريطة حتى الإنهاء</span>
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
