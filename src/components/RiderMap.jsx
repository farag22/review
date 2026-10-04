import React, { useEffect, useState } from "react";
import MapView from "./MapView";
import { NearbyCaptainsService } from "../lib/NearbyCaptainsService";

function driverPoint(driver) {
  const lat = Number(driver?.lat ?? driver?.current_lat);
  const lng = Number(driver?.lng ?? driver?.current_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: driver.id,
    lat,
    lng,
    label: driver.full_name ? "كابتن" : "متاح",
  };
}

export default function RiderMap({
  centerLat,
  centerLng,
  radiusKm = 5,
  height = 210,
  onLocate,
}) {
  const [pins, setPins] = useState([]);
  const center =
    Number.isFinite(Number(centerLat)) && Number.isFinite(Number(centerLng))
      ? { lat: Number(centerLat), lng: Number(centerLng) }
      : null;

  useEffect(() => {
    if (!center) return undefined;
    let cancelled = false;
    let unsubscribe = () => {};

    NearbyCaptainsService.getNearbyDrivers(center.lat, center.lng, radiusKm)
      .then((drivers) => {
        if (cancelled) return;
        setPins((drivers || []).map(driverPoint).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setPins([]);
      });

    try {
      unsubscribe = NearbyCaptainsService.subscribeToDrivers(
        (driver) => {
          const pin = driverPoint(driver);
          if (!pin) return;
          setPins((prev) => {
            const next = prev.filter((p) => p.id !== pin.id);
            next.push(pin);
            return next;
          });
        },
        (id) => {
          setPins((prev) => prev.filter((p) => p.id !== id));
        }
      );
    } catch {
      unsubscribe = () => {};
    }

    return () => {
      cancelled = true;
      try {
        unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [centerLat, centerLng, radiusKm]);

  return (
    <MapView
      height={height}
      userLocation={center}
      showAccuracy
      showRecenter
      follow
      locate
      onLocate={onLocate}
      ridePins={pins}
    />
  );
}
