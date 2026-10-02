// src/lib/NearbyCaptainsService.js
import { supabase } from './supabase';
import { haversineKm } from './geo';

export const NearbyCaptainsService = {
  /**
   * Fetch online drivers within a certain radius (in km) from a given point.
   */
  async getNearbyDrivers(lat, lng, radiusKm = 5) {
    try {
      const { data: drivers, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_online', true)
        .not('current_lat', 'is', null)
        .not('current_lng', 'is', null);

      if (error) throw error;
      if (!drivers) return [];

      const nearby = drivers.filter(driver => {
        const distance = haversineKm(
          { lat, lng },
          { lat: driver.current_lat, lng: driver.current_lng }
        );
        return distance <= radiusKm;
      });

      return nearby;
    } catch (err) {
      console.error('Error fetching nearby drivers:', err);
      return [];
    }
  },

  /**
   * Subscribe to real-time location and status changes for drivers.
   */
  subscribeToDrivers(onDriverUpdate, onDriverRemove) {
    const channel = supabase
      .channel('public:drivers:tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
        },
        (payload) => {
          const updatedDriver = payload.new;
          if (!updatedDriver.is_online || !updatedDriver.current_lat) {
            if (onDriverRemove) onDriverRemove(updatedDriver.id);
          } else {
            if (onDriverUpdate) onDriverUpdate(updatedDriver);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
