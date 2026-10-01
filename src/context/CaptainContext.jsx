import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { calcFare, geoErrorMessage, getCurrentCoords, getRoute, haversineKm, watchPosition } from "../lib/geo";
import {
  CAPTAIN_LOCKED_MSG,
  WALLET_INSUFFICIENT_MSG,
  appCommission,
  captainDebt,
  captainNet,
  isCaptainLocked,
  roundMoney,
} from "../lib/finance";

function mapCaptainError(error, fallback) {
  const msg = error?.message || "";
  if (/رصيد المحفظة غير كاف/.test(msg)) return WALLET_INSUFFICIENT_MSG;
  if (/مديونية|مقفول|مغلق/.test(msg)) return CAPTAIN_LOCKED_MSG;
  return msg || fallback;
}

function startOfLocalDayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const CaptainContext = createContext(null);

const ACTIVE_STATUSES = ["accepted", "arrived", "in_progress"];

export function CaptainProvider({ children }) {
  const { user } = useAuth();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [pendingRides, setPendingRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [route, setRoute] = useState(null);
  const [riderProfile, setRiderProfile] = useState(null);
  const [rideTypes, setRideTypes] = useState([]);
  const [error, setError] = useState("");
  const [debtRequests, setDebtRequests] = useState([]);
  const [todayEarnings, setTodayEarnings] = useState({
    rides: 0,
    gross: 0,
    commission: 0,
    net: 0,
    cashCommissionDue: 0,
    walletCredit: 0,
  });
  const driverRef = useRef(null);
  const lastGpsRef = useRef(null);

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
      setDebtRequests([]);
      return undefined;
    }
    loadDebtRequests();
    return undefined;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setDriver(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    async function loadDriver(initial = false) {
      if (initial) setLoading(true);
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
      if (initial) setLoading(false);
    }

    loadDriver(true);
    const poll = setInterval(() => loadDriver(false), 8000);
    const channel = supabase
      .channel(`captain-driver-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers", filter: `user_id=eq.${user.id}` },
        () => loadDriver(false)
      )
      .subscribe();
    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function refreshLocation() {
    try {
      const coords = await getCurrentCoords();
      setLocation(coords);
      lastGpsRef.current = coords;
      if (driverRef.current?.id) {
        await supabase
          .from("drivers")
          .update({ lat: coords.lat, lng: coords.lng })
          .eq("id", driverRef.current.id);
        setDriver((prevDriver) =>
          prevDriver ? { ...prevDriver, lat: coords.lat, lng: coords.lng } : prevDriver
        );
      }
    } catch (err) {
      setError(geoErrorMessage(err));
    }
  }

  useEffect(() => {
    if (!driver?.id) return undefined;
    const stop = watchPosition(
      async (coords) => {
        const prev = lastGpsRef.current;
        let heading = coords.heading;
        if (!Number.isFinite(heading) && prev?.lat != null) {
          const dLng = coords.lng - prev.lng;
          const y = Math.sin((dLng * Math.PI) / 180) * Math.cos((coords.lat * Math.PI) / 180);
          const x =
            Math.cos((prev.lat * Math.PI) / 180) * Math.sin((coords.lat * Math.PI) / 180) -
            Math.sin((prev.lat * Math.PI) / 180) *
              Math.cos((coords.lat * Math.PI) / 180) *
              Math.cos((dLng * Math.PI) / 180);
          heading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
        }
        const next = { ...coords, heading };
        setLocation(next);
        const moved = !prev || haversineKm(prev, coords) >= 0.02;
        if (!moved) return;
        lastGpsRef.current = next;
        if (!driverRef.current?.is_online && !activeRide) return;
        await supabase
          .from("drivers")
          .update({ lat: coords.lat, lng: coords.lng })
          .eq("id", driver.id);
        setDriver((prevDriver) =>
          prevDriver ? { ...prevDriver, lat: coords.lat, lng: coords.lng } : prevDriver
        );
      },
      (err) => setError(geoErrorMessage(err))
    );
    return stop;
  }, [driver?.id, activeRide?.id]);

  async function refreshPendingAndActive() {
    const current = driverRef.current;
    if (!current?.id) {
      setPendingRides([]);
      setActiveRide(null);
      setTodayEarnings({ rides: 0, gross: 0, commission: 0, net: 0, cashCommissionDue: 0, walletCredit: 0 });
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

    if (isCaptainLocked(current) || !current.is_online) {
      setPendingRides([]);
      await refreshTodayEarnings(current);
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
    await refreshTodayEarnings(current);
  }

  async function refreshTodayEarnings(currentDriver = driverRef.current) {
    if (!currentDriver?.id) {
      setTodayEarnings({ rides: 0, gross: 0, commission: 0, net: 0, cashCommissionDue: 0, walletCredit: 0 });
      return;
    }
    const since = startOfLocalDayIso();
    let { data, error: earningsError } = await supabase
      .from("rides")
      .select("fare, payment_method, app_commission, captain_net, completed_at")
      .eq("driver_id", currentDriver.id)
      .eq("status", "completed")
      .gte("completed_at", since);
    if (earningsError && /app_commission|captain_net/i.test(earningsError.message || "")) {
      ({ data } = await supabase
        .from("rides")
        .select("fare, payment_method, completed_at")
        .eq("driver_id", currentDriver.id)
        .eq("status", "completed")
        .gte("completed_at", since));
    }
    const rows = data || [];
    const summary = rows.reduce(
      (acc, ride) => {
        const fare = Number(ride.fare) || 0;
        const commission = Number(ride.app_commission);
        const net = Number(ride.captain_net);
        const cut = Number.isFinite(commission) ? commission : appCommission(fare);
        const takeHome = Number.isFinite(net) ? net : captainNet(fare);
        acc.rides += 1;
        acc.gross = roundMoney(acc.gross + fare);
        acc.commission = roundMoney(acc.commission + cut);
        acc.net = roundMoney(acc.net + takeHome);
        if (ride.payment_method === "wallet") acc.walletCredit = roundMoney(acc.walletCredit + takeHome);
        else acc.cashCommissionDue = roundMoney(acc.cashCommissionDue + cut);
        return acc;
      },
      { rides: 0, gross: 0, commission: 0, net: 0, cashCommissionDue: 0, walletCredit: 0 }
    );
    setTodayEarnings(summary);
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
    if (!activeRide?.id) {
      setRoute(null);
      setRiderProfile(null);
      return undefined;
    }
    let cancelled = false;
    const pickup = { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng };
    const dropoff = { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng };
    getRoute(pickup, dropoff).then((r) => {
      if (!cancelled) setRoute(r);
    });
    if (activeRide.rider_id) {
      supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", activeRide.rider_id)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setRiderProfile(data || null);
        });
    } else {
      setRiderProfile(null);
    }
    return () => {
      cancelled = true;
    };
  }, [activeRide?.id, activeRide?.rider_id, activeRide?.pickup_lat, activeRide?.dropoff_lat]);

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
    if (!driver?.is_online && isCaptainLocked(driver)) {
      setError(CAPTAIN_LOCKED_MSG);
      return;
    }
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
    if (isCaptainLocked(driver)) throw new Error(CAPTAIN_LOCKED_MSG);
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
    if (updateError) throw new Error(mapCaptainError(updateError, "تعذر تحديث حالة الرحلة"));
    if (status === "completed") {
      setActiveRide(null);
      await Promise.all([loadDriverDebt(), refreshTodayEarnings()]);
    } else setActiveRide(data);
    return data;
  }

  async function loadDriverDebt() {
    if (!driverRef.current?.id) return null;
    const { data } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", driverRef.current.id)
      .maybeSingle();
    if (data) {
      setDriver(data);
      return data;
    }
    return null;
  }

  async function loadDebtRequests() {
    if (!user?.id) {
      setDebtRequests([]);
      return [];
    }
    const { data } = await supabase
      .from("wallet_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("kind", "debt_pay")
      .order("created_at", { ascending: false })
      .limit(8);
    setDebtRequests(data || []);
    return data || [];
  }

  async function submitDebtPayment({ amount, phoneNumber, receiptUrl }) {
    if (!driver?.id) throw new Error("لا يوجد حساب كابتن");
    const value = roundMoney(amount);
    if (!Number.isFinite(value) || value <= 0) throw new Error("أدخل مبلغًا صحيحًا");
    const { error: insertError } = await supabase.from("wallet_requests").insert({
      user_id: user.id,
      amount: value,
      phone_number: phoneNumber,
      receipt_image_url: receiptUrl || null,
      kind: "debt_pay",
      status: "pending",
    });
    if (insertError) {
      if (/kind/i.test(insertError.message || "")) {
        throw new Error("شغّل supabase/captain-debt.sql لتفعيل سداد المديونية");
      }
      throw insertError;
    }
    await loadDebtRequests();
  }

  const value = {
    driver,
    loading,
    location,
    pendingRides,
    activeRide,
    route,
    riderProfile,
    rideTypes,
    error,
    setError,
    todayEarnings,
    debt: captainDebt(driver),
    locked: isCaptainLocked(driver),
    debtRequests,
    refreshLocation,
    toggleOnline,
    acceptRide,
    updateActiveStatus,
    refreshPendingAndActive,
    refreshTodayEarnings,
    loadDriverDebt,
    loadDebtRequests,
    submitDebtPayment,
  };

  return <CaptainContext.Provider value={value}>{children}</CaptainContext.Provider>;
}

export function useCaptain() {
  const ctx = useContext(CaptainContext);
  if (!ctx) throw new Error("useCaptain must be used inside CaptainProvider");
  return ctx;
}
