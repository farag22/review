import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../../components/MapView";
import RideLiveOverlay from "../../components/RideLiveOverlay";
import { useRide } from "../../context/RideContext";
import { supabase } from "../../lib/supabase";

export default function FindingDriver() {
  const navigate = useNavigate();
  const { pickup, destination, selectedRide, activeRide, cancelRide, refreshDriver, setActiveRide } = useRide();
  const [status, setStatus] = useState(activeRide?.status || "requested");
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

  useEffect(() => {
    const rideId = activeRide?.id;
    if (!rideId) return undefined;

    let done = false;
    async function maybeAdvance(ride) {
      if (!ride || done) return;
      setStatus(ride.status);
      setActiveRide((prev) => (prev && prev.id === ride.id && prev.status === ride.status && prev.driver_id === ride.driver_id ? prev : ride));
      if (ride.driver_id) await refreshDriver(ride.driver_id);
      if (ride.status === "accepted" || ride.driver_id) {
        done = true;
        navigate("/confirm-pickup");
      }
    }

    if (activeRide?.driver_id || activeRide?.status === "accepted") {
      maybeAdvance(activeRide);
    }

    const channel = supabase
      .channel(`ride-${rideId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => maybeAdvance(payload.new)
      )
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase.from("rides").select("*").eq("id", rideId).maybeSingle();
      if (data) maybeAdvance(data);
    }, 2500);

    return () => {
      done = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [activeRide?.id]);

  async function handleCancel() {
    await cancelRide();
    navigate("/choose-ride");
  }

  return (
    <div className="ride-live">
      <div className="ride-live-map">
        <MapView fill height="100%" pickup={mapPickup} destination={mapDestination}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-4 h-4 rounded-full bg-brand-600 animate-ping absolute" />
            <span className="w-4 h-4 rounded-full bg-brand-600" />
          </div>
        </MapView>
      </div>

      <RideLiveOverlay
        badge="جاري البحث"
        chatTitle="مراسلة السائق"
        chatBody="الخريطة ظاهرة أثناء البحث. الاتصال والدردشة يتاحان بعد قبول الكابتن."
      />

      <div className="ride-live-sheet bg-white rounded-t-3xl px-6 pt-6 pb-8 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <p className="text-center font-extrabold text-[16px]">
          {status === "accepted" ? "تم العثور على سائق" : "جاري البحث عن سائق قريب"}
        </p>
        <p className="text-center text-ink/50 text-[13px] mt-1">
          {selectedRide?.label || "رحلتك"} · {destination?.label || ""}
        </p>

        <div className="flex justify-center gap-2 my-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-brand-500"
              style={{ animation: `pulse 1.2s ${i * 0.2}s infinite ease-in-out` }}
            />
          ))}
        </div>

        <button
          onClick={handleCancel}
          className="w-full h-12 rounded-2xl border border-red-200 text-red-500 font-bold text-[14px]"
        >
          إلغاء الطلب
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: .3; transform: scale(.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
