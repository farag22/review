// src/components/CaptainTracker.js
import React, { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { haversineKm } from '../lib/geo';

export default function CaptainTracker({ isOnline }) {
  const watchIdRef = useRef(null);
  const lastPosRef = useRef({ lat: null, lng: null });

  useEffect(() => {
    if (!isOnline) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;

        // Reject if accuracy is too low (> 50 meters)
        if (accuracy !== null && accuracy > 50) {
          return;
        }

        // Check for unrealistic jumps if we have an old position
        if (lastPosRef.current.lat && lastPosRef.current.lng) {
          const distanceKm = haversineKm(
            { lat: lastPosRef.current.lat, lng: lastPosRef.current.lng },
            { lat: latitude, lng: longitude }
          );
          if (distanceKm > 1) {
            return; // Ignore sudden jumps/glitches
          }
        }

        lastPosRef.current = { lat: latitude, lng: longitude };

        try {
          // Call Supabase RPC function safely
          const { error } = await supabase.rpc('update_driver_location', {
            p_lat: latitude,
            p_lng: longitude,
            p_accuracy: accuracy,
            p_heading: heading || 0,
            p_speed: speed || 0
          });

          if (error) {
            console.error('Error updating driver location via RPC:', error);
          }
        } catch (err) {
          console.error('Failed to send location update:', err);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOnline]);

  return null; // Background component, renders nothing visually
}
