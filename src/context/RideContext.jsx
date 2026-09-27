import React, { createContext, useContext, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const RideContext = createContext(null);

const RIDE_OPTIONS = [
  { id: "comfort", label: "Comfort", seats: 4, eta: 5, price: 3000 },
  { id: "masseya", label: "Masseya", seats: 4, eta: 5, price: 2500 },
  { id: "scooter", label: "سكوتر", seats: 1, eta: 3, price: 1000 },
  { id: "tuktuk", label: "توك توك", seats: 3, eta: 4, price: 1900 },
  { id: "economy", label: "اقتصادي", seats: 4, eta: 6, price: 2600 },
];

export function RideProvider({ children }) {
  const { user } = useAuth();
  const [pickup, setPickup] = useState({ label: "الموقع الحالي", address: "" });
  const [destination, setDestination] = useState(null);
  const [stops, setStops] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [activeRide, setActiveRide] = useState(null);

  async function requestRide() {
    const ride = {
      rider_id: user?.id,
      pickup_address: pickup?.address || pickup?.label,
      dropoff_address: destination?.address || destination?.label,
      ride_type: selectedRide?.id,
      fare: selectedRide?.price,
      payment_method: paymentMethod,
      status: "requested",
    };

    const { data, error } = await supabase
      .from("rides")
      .insert(ride)
      .select()
      .single();

    if (error) {
      // Fallback لعرض تجريبي بدون اتصال فعلي بقاعدة البيانات
      const fallback = { ...ride, id: `local-${Date.now()}`, status: "requested" };
      setActiveRide(fallback);
      return fallback;
    }
    setActiveRide(data);
    return data;
  }

  const value = {
    rideOptions: RIDE_OPTIONS,
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
    requestRide,
  };

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
}

export function useRide() {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error("useRide must be used inside RideProvider");
  return ctx;
}
