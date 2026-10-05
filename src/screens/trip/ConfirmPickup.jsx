import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../../components/MapView";
import RideLiveOverlay from "../../components/RideLiveOverlay";
import { PrimaryButton } from "../../components/ui";
import { useRide } from "../../context/RideContext";
import { formatMinutes, haversineKm, minutesOnly } from "../../lib/geo";
import { supabase } from "../../lib/supabase";

export default function ConfirmPickup() {
  const navigate = useNavigate();
  const { pickup, destination, driver, refreshDriver, activeRide, updateRideStatus, cancelRide, route, setActiveRide } = useRide();
  const [error, setError] = useState("");

  useEffect(() => {
    const driverId = activeRide?.driver_id;
    if (!driverId) return undefined;
    refreshDriver(driverId);
    const poll = setInterval(() => refreshDriver(driverId), 4000);
    const channel = supabase
      .channel(`pickup-driver-${driverId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drivers", filter: `id=eq.${driverId}` },
        () => refreshDriver(driverId)
      )
      .subscribe();
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [activeRide?.driver_id, refreshDriver]);

  useEffect(() => {
    const rideId = activeRide?.id;
    if (!rideId) return undefined;
    const channel = supabase
      .channel(`pickup-ride-${rideId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => {
          const ride = payload.new;
          if (!ride) return;
          setActiveRide(ride);
          if (ride.status === "in_progress") navigate("/trip-progress");
          if (ride.status === "completed") navigate("/trip-completed");
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
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

  const eta = minutesOnly(
    driver?.lat && mapPickup?.lat
      ? (haversineKm(driver, mapPickup) / 28) * 60
      : activeRide?.duration_min
        ? Math.max(2, activeRide.duration_min * 0.2)
        : 5
  );

  async function startTrip() {
    setError("");
    try {
      await updateRideStatus("in_progress");
      navigate("/trip-progress");
    } catch (err) {
      setError(err.message || "تعذر بدء الرحلة");
    }
  }

  async function handleCancel() {
    await cancelRide();
    navigate("/home");
  }

  const name = driver?.full_name || "جاري تحديد السائق";
  const car = [driver?.car_model, driver?.plate_number].filter(Boolean).join(" · ");

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
          userLocation={pickup}
          path={route?.path}
          routeInfo={route}
          showRecenter
        />
      </div>

      <RideLiveOverlay
        badge="السائق في الطريق"
        phone={driver?.phone}
        chatTitle="مراسلة السائق"
        chatBody="التتبع يعمل على الخريطة. يمكنك التواصل أثناء انتظار الوصول."
        rideId={activeRide?.id}
        senderRole="rider"
        otherLabel="الكابتن"
      />

      <div className="ride-live-sheet bg-white rounded-t-3xl px-5 pt-5 pb-6 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-extrabold text-[15px]">
              {driver ? "السائق في الطريق إليك" : "بانتظار تعيين سائق"}
            </p>
            <p className="text-ink/50 text-[12px] mt-0.5">يصل خلال {formatMinutes(eta)}</p>
          </div>
          <span className="text-brand-600 font-extrabold text-[15px]">{formatMinutes(eta)}</span>
        </div>

        <div className="rounded-2xl bg-sand p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700">
            {name[0]}
          </div>
          <div className="flex-1">
            <p className="font-bold text-[14px]">{name}</p>
            <p className="text-[12px] text-ink/50">
              {car || "سيتم عرض بيانات السيارة عند التعيين"}
              {driver?.rating ? ` · ★ ${driver.rating}` : ""}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-black/10 p-3">
          <p className="text-[12px] text-ink/45">نقطة الالتقاء</p>
          <p className="text-[13px] font-semibold mt-0.5">{mapPickup?.label || pickup?.label || "الموقع الحالي"}</p>
        </div>

        {error && <p className="text-red-500 text-[13px]">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCancel}
            className="h-12 rounded-2xl border border-red-200 text-red-500 font-bold text-[13px]"
          >
            إلغاء الطلب
          </button>
          <PrimaryButton onClick={startTrip} className="h-12" disabled={!driver}>
            بدء الرحلة
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
