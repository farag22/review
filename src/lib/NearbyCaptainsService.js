import { supabase } from "./supabase";

function driverPoint(driver) {
  if (!driver) return null;
  const lat = Number(driver.lat ?? driver.current_lat);
  const lng = Number(driver.lng ?? driver.current_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { ...driver, lat, lng };
}

export const NearbyCaptainsService = {
  async getNearbyDrivers() {
    try {
      const { data: drivers, error } = await supabase
        .from("drivers")
        .select("id, full_name, is_online, lat, lng, ride_type")
        .eq("is_online", true);

      if (error) throw error;
      return (drivers || []).map(driverPoint).filter(Boolean);
    } catch (err) {
      console.error("Error fetching nearby drivers:", err);
      return [];
    }
  },

  subscribeToDrivers(onDriverUpdate, onDriverRemove) {
    const channel = supabase
      .channel("public:drivers:tracking")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drivers",
        },
        (payload) => {
          const updatedDriver = driverPoint(payload.new);
          if (!updatedDriver || !updatedDriver.is_online) {
            const id = payload.new?.id || payload.old?.id;
            if (id && onDriverRemove) onDriverRemove(id);
            return;
          }
          if (onDriverUpdate) onDriverUpdate(updatedDriver);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
