import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { BANHA, calcFare, getRoute, haversineKm, watchPosition } from "../lib/geo";

const CaptainContext = createContext(null);

const ACTIVE_STATUSES = ["accepted", "arrived", "in_progress"];

export function CaptainProvider({ children }) {
  const { user } = useAuth();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(BANHA);
  const [pendingRides, setPendingRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [route, setRoute] = useState(null);
  const [rideTypes, setRideTypes] = useState([]);
  const [error, setError] = useState("");
  const driverRef = useRef(null);

  useEffect(() => {
    driverRef.current = driver;
  }, [driver]);

  useEffect(() => {
    supabase.from("ride_types").select("*").then(({ data }) => {
      if (data?.length) setRideTypes(data);
    });
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setDriver(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    async function loadDriver() {
      setLoading(true);
      const { data, error: loadError } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (loadError) setError(loadError.message);
      setDriver(data || null);
      if (data?.lat != null && data?.lng != null) {
        setLocation({ lat: data.lat, lng: data.lng });
      }
      setLoading(false);
    }

    loadDriver();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!driver?.id || !driver.is_online) return undefined;
    const stop = watchPosition(
      async (coords) => {
        setLocation(coords);
        await supabase
          .from("drivers")
          .update({ lat: coords.lat, lng: coords.lng })
          .eq("id", driver.id);
        setDriver((prev) => (prev ? { ...prev, lat: coords.lat, lng: coords.lng } : prev));
      },
      () => setError("فعّل إذن الموقع لتحديث موقعك على الخريطة")
    );
    return stop;
  }, [driver?.id, driver?.is_online]);

  async function refreshPendingAndActive() {
    const current = driverRef.current;
    if (!current?.id) {
      setPendingRides([]);
      setActiveRide(null);
      return;
    }

    const { data: active } = await supabase
      .from("rides")
      .select("*")
      .eq("driver_id", current.id)
      .in("status", ACTIVE_STATUSES)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveRide(active || null);

    if (!current.is_online) {
      setPendingRides([]);
      return;
    }

    let query = supabase
      .from("rides")
      .select("*")
      .eq("status", "requested")
      .is("driver_id", null)
      .order("requested_at", { ascending: false })
      .limit(20);
    if (current.ride_type) query = query.eq("ride_type", current.ride_type);
    const { data } = await query;
    setPendingRides(data || []);
  }

  useEffect(() => {
    if (!driver?.id) return undefined;
    refreshPendingAndActive();

    const channel = supabase
      .channel(`captain-rides-${driver.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides" },
        () => refreshPendingAndActive()
      )
      .subscribe();

    const poll = setInterval(refreshPendingAndActive, 4000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [driver?.id, driver?.is_online, driver?.ride_type]);

  useEffect(() => {
    if (!activeRide || location?.lat == null) {
      setRoute(null);
      return undefined;
    }
    let cancelled = false;
    const pickup = { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng };
    const dropoff = { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng };
    const from = location;
    const to = activeRide.status === "in_progress" ? dropoff : pickup;
    getRoute(from, to).then((r) => {
      if (!cancelled) setRoute(r);
    });
    return () => {
      cancelled = true;
    };
  }, [activeRide?.id, activeRide?.status, location?.lat, location?.lng]);

  async function patchDriver(fields) {
    if (!driver?.id) return null;
    const { data, error: patchError } = await supabase
      .from("drivers")
      .update(fields)
      .eq("id", driver.id)
      .select()
      .single();
    if (patchError) throw patchError;
    setDriver(data);
    return data;
  }

  async function toggleOnline() {
    setError("");
    const next = !driver?.is_online;
    const fields = { is_online: next };
    if (next && location?.lat != null) {
      fields.lat = location.lat;
      fields.lng = location.lng;
    }
    try {
      await patchDriver(fields);
    } catch (err) {
      setError(err.message || "تعذر تحديث حالة الاتصال");
    }
  }

  async function acceptRide(ride) {
    if (!driver?.id) throw new Error("لا يوجد حساب كابتن");
    if (!driver.is_online) throw new Error("اتصل أولاً لقبول الطلبات");
    const { data, error: acceptError } = await supabase
      .from("rides")
      .update({
        driver_id: driver.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", ride.id)
      .eq("status", "requested")
      .is("driver_id", null)
      .select()
      .maybeSingle();
    if (acceptError) throw acceptError;
    if (!data) throw new Error("تم قبول الطلب من كابتن آخر");
    setActiveRide(data);
    setPendingRides((list) => list.filter((r) => r.id !== ride.id));
    return data;
  }

  async function updateActiveStatus(status) {
    if (!activeRide?.id || !driver?.id) return null;
    const patch = { status };
    if (status === "arrived") patch.arrived_at = new Date().toISOString();
    if (status === "in_progress") patch.started_at = new Date().toISOString();
    if (status === "completed") {
      const pickup = { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng };
      const dropoff = { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng };
      const computed = await getRoute(pickup, dropoff);
      const distanceKm = computed?.distanceKm || haversineKm(pickup, dropoff);
      const durationMin =
        computed?.durationMin ||
        Math.max(1, Math.round((distanceKm / 28) * 60));
      const type =
        rideTypes.find((t) => t.id === activeRide.ride_type) || {
          base_fare: 12,
          per_km: 4.5,
          per_min: 0.35,
        };
      patch.completed_at = new Date().toISOString();
      patch.distance_km = Number(distanceKm.toFixed(2));
      patch.duration_min = durationMin;
      patch.fare = calcFare(type, distanceKm, durationMin);
      if (activeRide.started_at) {
        const elapsed = Math.max(
          1,
          Math.round((Date.now() - new Date(activeRide.started_at).getTime()) / 60000)
        );
        patch.duration_min = elapsed;
        patch.fare = calcFare(type, distanceKm, elapsed);
      }
    }

    let { data, error: updateError } = await supabase
      .from("rides")
      .update(patch)
      .eq("id", activeRide.id)
      .eq("driver_id", driver.id)
      .select()
      .single();
    if (updateError && /arrived_at|distance_km|duration_min/i.test(updateError.message || "")) {
      const { arrived_at, distance_km, duration_min, ...legacy } = patch;
      ({ data, error: updateError } = await supabase
        .from("rides")
        .update(legacy)
        .eq("id", activeRide.id)
        .eq("driver_id", driver.id)
        .select()
        .single());
    }
    if (updateError) throw updateError;
    if (status === "completed") setActiveRide(null);
    else setActiveRide(data);
    return data;
  }

  const value = {
    driver,
    loading,
    location,
    pendingRides,
    activeRide,
    route,
    rideTypes,
    error,
    setError,
    toggleOnline,
    acceptRide,
    updateActiveStatus,
    refreshPendingAndActive,
  };

  return <CaptainContext.Provider value={value}>{children}</CaptainContext.Provider>;
}

export function useCaptain() {
  const ctx = useContext(CaptainContext);
  if (!ctx) throw new Error("useCaptain must be used inside CaptainProvider");
  return ctx;
}
