// src/components/RiderMap.jsx
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NearbyCaptainsService } from '../lib/NearbyCaptainsService';
import { CaptainMarkerAnimator } from '../lib/CaptainMarkerAnimator';

export default function RiderMap({ centerLat, centerLng, radiusKm = 5 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const animatorsRef = useRef({});
  const [driversCount, setDriversCount] = useState(0);

  // Initialize Leaflet map (Assuming Leaflet 'L' is available globally or imported)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    if (L) {
      const map = L.map(mapRef.current, { zoomControl: false, scrollWheelZoom: true, touchZoom: true })
        .setView([centerLat || 30.466, centerLng || 31.185], 14);
      L.control.zoom({ position: 'topright' }).addTo(map);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Fetch nearby drivers and listen to realtime updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !centerLat || !centerLng) return;

    // Load initial nearby drivers
    NearbyCaptainsService.getNearbyDrivers(centerLat, centerLng, radiusKm).then((drivers) => {
      setDriversCount(drivers.length);
      
      drivers.forEach((driver) => {
        updateOrAddDriverMarker(driver, map);
      });
    });

    // Subscribe to realtime location updates
    const unsubscribe = NearbyCaptainsService.subscribeToDrivers(
      (updatedDriver) => {
        updateOrAddDriverMarker(updatedDriver, map);
      },
      (removedDriverId) => {
        removeDriverMarker(removedDriverId);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [centerLat, centerLng, radiusKm]);

  const updateOrAddDriverMarker = (driver, map) => {
    const lat = driver.current_lat ?? driver.lat;
    const lng = driver.current_lng ?? driver.lng;
    if (!L || lat == null || lng == null) return;

    const latLng = [lat, lng];

    if (markersRef.current[driver.id]) {
      // Animate existing marker smoothly
      const animator = animatorsRef.current[driver.id];
      if (animator) {
        animator.animateTo(lat, lng);
        animator.updateHeading(driver.heading);
      } else {
        markersRef.current[driver.id].setLatLng(latLng);
      }
    } else {
      // Create custom marker for driver
      const customIcon = L.divIcon({
        className: 'driver-marker-container',
        html: `<div class="driver-marker-icon" style="transform: rotate(${driver.heading || 0}deg); background: #10B981; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 3px 6px rgba(0,0,0,0.2); font-size: 16px;">🚗</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = window.L.marker(latLng, { icon: customIcon }).addTo(map);
      marker.bindPopup(`<b>كابتن:</b> ${driver.full_name || 'متاح'}<br><b>الحالة:</b> متصل`);
      
      markersRef.current[driver.id] = marker;
      animatorsRef.current[driver.id] = new CaptainMarkerAnimator(marker, map);
      
      setDriversCount((prev) => prev + 1);
    }
  };

  const removeDriverMarker = (driverId) => {
    if (markersRef.current[driverId]) {
      markersRef.current[driverId].remove();
      delete markersRef.current[driverId];
    }
    if (animatorsRef.current[driverId]) {
      animatorsRef.current[driverId].destroy();
      delete animatorsRef.current[driverId];
    }
    setDriversCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-md">
      <div ref={mapRef} className="w-full h-full absolute inset-0 z-0" />
      <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur px-4 py-2 rounded-xl shadow-md border border-gray-100">
        <span className="text-xs font-bold text-gray-700">الكباتن المتاحون بالقرب منك: </span>
        <span className="text-sm font-extrabold text-emerald-600">{driversCount}</span>
      </div>
    </div>
  );
}
