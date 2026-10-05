import { supabase } from "./supabase";

export async function quoteRidePrice({ pickup, destination, distanceKm, durationMinutes, rideType, waitingMinutes = 0 }) {
  const { data, error } = await supabase.rpc("pricing_quote", {
    p_pickup_lat: Number(pickup?.lat),
    p_pickup_lng: Number(pickup?.lng),
    p_dropoff_lat: Number(destination?.lat),
    p_dropoff_lng: Number(destination?.lng),
    p_distance_km: Number(distanceKm) || 0,
    p_duration_minutes: Math.round(Number(durationMinutes) || 0),
    p_ride_type: rideType || "economy",
    p_waiting_minutes: Number(waitingMinutes) || 0,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}

export async function createPricedRide({ pickup, destination, pickupAddress, dropoffAddress, rideType, distanceKm, durationMinutes, paymentMethod, scheduledAt }) {
  const { data, error } = await supabase.rpc("create_ride_priced", {
    p_pickup_lat: Number(pickup?.lat),
    p_pickup_lng: Number(pickup?.lng),
    p_dropoff_lat: Number(destination?.lat),
    p_dropoff_lng: Number(destination?.lng),
    p_pickup_address: pickupAddress || pickup?.label || null,
    p_dropoff_address: dropoffAddress || destination?.label || null,
    p_ride_type: rideType || "economy",
    p_distance_km: Number(distanceKm) || 0,
    p_duration_minutes: Math.round(Number(durationMinutes) || 0),
    p_payment_method: paymentMethod || "cash",
    p_scheduled_at: scheduledAt || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}
