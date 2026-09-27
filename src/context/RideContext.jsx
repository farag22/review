import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { BANHA, calcFare, getRoute, reverseGeocode, watchPosition } from "../lib/geo";

const RideContext = createContext(null);

const DEFAULT_TYPES = [
  { id: "economy", label: "اقتصادي", seats: 4, base_fare: 12, per_km: 4.5, per_min: 0.35 },
  { id: "comfort", label: "Comfort", seats: 4, base_fare: 18, per_km: 6.5, per_min: 0.5 },
  { id: "masseya", label: "Masseya", seats: 4, base_fare: 15, per_km: 5.5, per_min: 0.4 },
  { id: "tuktuk", label: "توك توك", seats: 3, base_fare: 8, per_km: 3.2, per_min: 0.25 },
  { id: "scooter", label: "سكوتر", seats: 1, base_fare: 7, per_km: 3.0, per_min: 0.2 },
];

export function RideProvider({ children }) {
  const { user } = useAuth();
  const [pickup, setPickup] = useState({ label: "جاري تحديد موقعك...", address: "", lat: BANHA.lat, lng: BANHA.lng });
  const [destination, setDestination] = useState(null);
  const [stops, setStops] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [activeRide, setActiveRide] = useState(null);
  const [driver, setDriver] = useState(null);
  const [rideTypes, setRideTypes] = useState(DEFAULT_TYPES);
  const [route, setRoute] = useState(null);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [locationError, setLocationError] = useState("");
  const [gpsReady, setGpsReady] = useState(false);

  useEffect(() => {
    const stop = watchPosition(
      async (coords) => {
        setGpsReady(true);
        setLocationError("");
        try {
          const place = await reverseGeocode(coords.lat, coords.lng);
          setPickup((prev) => {
            const locked = prev?.manual;
            if (locked) return { ...prev, accuracy: coords.accuracy };
            return { ...place, accuracy: coords.accuracy };
          });
        } catch {
          setPickup((prev) =>
            prev?.manual ? prev : { label: "موقعك الحالي", address: "", lat: coords.lat, lng: coords.lng }
          );
        }
      },
      () => {
        setLocationError("فعّل إذن الموقع لتحديد نقطة الانطلاق بدقة");
      }
    );
    return stop;
  }, []);

  useEffect(() => {
    supabase
      .from("ride_types")
      .select("*")
      .then(({ data }) => {
        if (data?.length) setRideTypes(data);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_places")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSavedPlaces(data || []));

    supabase
      .from("payment_methods")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const def = data?.find((m) => m.is_default);
        if (def) setPaymentMethod(def.type);
      });
  }, [user]);

  useEffect(() => {
    if (!pickup?.lat || !destination?.lat) {
      setRoute(null);
      return undefined;
    }
    let cancelled = false;
    getRoute(pickup, destination, stops).then((r) => {
      if (!cancelled) setRoute(r);
    });
    return () => {
      cancelled = true;
    };
  }, [pickup, destination, stops]);

  const rideOptions = useMemo(() => {
    const distanceKm = route?.distanceKm || 0;
    const durationMin = route?.durationMin || 0;
    return rideTypes.map((t) => ({
      ...t,
      eta: Math.max(2, Math.round((durationMin || 8) * 0.15) + 3),
      price: calcFare(t, distanceKm, durationMin),
      distanceKm,
      durationMin,
    }));
  }, [rideTypes, route]);

  async function refreshDriver(driverId) {
    if (!driverId) {
      setDriver(null);
      return null;
    }
    const { data } = await supabase.from("drivers").select("*").eq("id", driverId).maybeSingle();
    setDriver(data || null);
    return data;
  }

  async function requestRide({ scheduledAt } = {}) {
    if (!user?.id) throw new Error("سجّل الدخول أولاً");
    if (!destination?.lat) throw new Error("حدد الوجهة أولاً");
    const option = selectedRide || rideOptions[0];
    if (!option) throw new Error("اختر نوع الرحلة");

    const payload = {
      rider_id: user.id,
      pickup_address: pickup?.address || pickup?.label,
      pickup_lat: pickup?.lat,
      pickup_lng: pickup?.lng,
      dropoff_address: destination?.address || destination?.label,
      dropoff_lat: destination?.lat,
      dropoff_lng: destination?.lng,
      ride_type: option.id,
      fare: option.price,
      distance_km: route?.distanceKm ? Number(route.distanceKm.toFixed(2)) : null,
      duration_min: route?.durationMin || null,
      payment_method: paymentMethod,
      status: scheduledAt ? "scheduled" : "requested",
      scheduled_at: scheduledAt || null,
    };

    let { data, error } = await supabase.from("rides").insert(payload).select().single();
    if (error && /distance_km|duration_min|scheduled_at/i.test(error.message || "")) {
      const { distance_km, duration_min, scheduled_at, ...legacy } = payload;
      ({ data, error } = await supabase.from("rides").insert(legacy).select().single());
    }
    if (error) throw error;

    if (stops.length && data?.id) {
      await supabase.from("ride_stops").insert(
        stops.map((s, i) => ({
          ride_id: data.id,
          label: s.label || s.address,
          lat: s.lat,
          lng: s.lng,
          wait_minutes: s.waitMinutes || 10,
          stop_order: i + 1,
        }))
      );
    }

    setActiveRide(data);
    if (data.driver_id) await refreshDriver(data.driver_id);
    return data;
  }

  async function updateRideStatus(status, extra = {}) {
    if (!activeRide?.id) return null;
    const patch = { status, ...extra };
    if (status === "in_progress") patch.started_at = new Date().toISOString();
    if (status === "completed") patch.completed_at = new Date().toISOString();
    const { data, error } = await supabase.from("rides").update(patch).eq("id", activeRide.id).select().single();
    if (error) throw error;
    setActiveRide(data);
    return data;
  }

  async function cancelRide() {
    if (activeRide?.id) {
      await supabase.from("rides").update({ status: "cancelled" }).eq("id", activeRide.id);
    }
    setActiveRide(null);
    setDriver(null);
  }

  async function savePlace({ label, place }) {
    if (!user?.id || !place) return;
    const row = {
      user_id: user.id,
      label,
      name: place.label,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    };
    const { data, error } = await supabase.from("saved_places").insert(row).select().single();
    if (!error && data) setSavedPlaces((list) => [data, ...list.filter((p) => p.label !== label)]);
    return data;
  }

  const value = {
    rideOptions,
    pickup,
    setPickup,
    destination,
    setDestination,
    stops,
    setStops,
    selectedRide,
    setSelectedRide,
    paymentMethod,
    setPaymentMethod,
    activeRide,
    setActiveRide,
    driver,
    setDriver,
    route,
    savedPlaces,
    locationError,
    gpsReady,
    requestRide,
    updateRideStatus,
    cancelRide,
    refreshDriver,
    savePlace,
  };

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
}

export function useRide() {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error("useRide must be used inside RideProvider");
  return ctx;
}
