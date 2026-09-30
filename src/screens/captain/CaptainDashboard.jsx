import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../../components/MapView";
import { useAuth } from "../../context/AuthContext";
import { useCaptain } from "../../context/CaptainContext";
import { formatDistance, formatEgp, haversineKm } from "../../lib/geo";

const TYPE_LABELS = {
  economy: "اقتصادي",
  comfort: "Comfort",
  masseya: "Masseya",
  tuktuk: "توك توك",
  scooter: "سكوتر",
};

export default function CaptainDashboard() {
  const navigate = useNavigate();
  const { user, supabase } = useAuth();
  const {
    driver,
    loading,
    location,
    pendingRides,
    activeRide,
    error,
    toggleOnline,
    acceptRide,
  } = useCaptain();
  const [busyId, setBusyId] = useState(null);
  const [localError, setLocalError] = useState("");

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink/50 text-[14px]">
        جاري تحميل حساب الكابتن...
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="font-bold">لم يتم ربط هذا الحساب بجدول السائقين</p>
        <button
          onClick={() => navigate("/captain/signup")}
          className="text-brand-600 font-bold text-[14px]"
        >
          تسجيل كابتن جديد
        </button>

        {/* زر تسجيل الخروج الإجباري وحل مشكلة الشاشة المعلقة */}
        <button
          onClick={async () => {
            localStorage.clear();
            sessionStorage.clear();
            if (supabase?.auth) {
              await supabase.auth.signOut();
            }
            window.location.href = "/login";
          }}
          className="mt-3 bg-red-600 text-white font-bold text-[14px] px-5 py-2.5 rounded-xl shadow"
        >
          تسجيل الخروج وإعادة المحاولة
        </button>
      </div>
    );
  }

  async function handleAccept(ride) {
    setLocalError("");
    setBusyId(ride.id);
    try {
      await acceptRide(ride);
      navigate("/captain/ride");
    } catch (err) {
      setLocalError(err.message || "تعذر قبول الطلب");
    } finally {
      setBusyId(null);
    }
  }

  const name = driver.full_name || user?.user_metadata?.full_name || "كابتن";
  const online = Boolean(driver.is_online);

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-ink/50">كابتن Sahil Drive</p>
          <p className="font-extrabold text-[18px]">{name}</p>
          <p className="text-[12px] text-ink/50 mt-0.5">
            {driver.car_model || "مركبة"}
            {driver.plate_number ? ` · ${driver.plate_number}` : ""}
            {driver.ride_type ? ` · ${TYPE_LABELS[driver.ride_type] || driver.ride_type}` : ""}
          </p>
        </div>
        <button
          onClick={() => navigate("/captain/profile")}
          className="w-11 h-11 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center"
        >
          {name ? name[0] : "ك"}
        </button>
      </div>

      <div className="px-5 mt-4">
        <button
          onClick={toggleOnline}
          className={`w-full h-14 rounded-2xl font-extrabold text-[15px] transition-colors ${
            online
              ? "bg-brand-600 text-white"
              : "bg-white border border-black/10 text-ink"
          }`}
        >
          {online ? "متصل — اضغط للتحويل لغير متصل" : "غير متصل — اضغط للاتصال"}
        </button>
        <p className="text-[12px] text-ink/45 mt-2 text-center">
          {online
            ? `موقعك يُحدَّث على الخريطة · ${location?.lat?.toFixed(4)}, ${location?.lng?.toFixed(4)}`
            : "اتصل لاستقبال الطلبات المطابقة لنوع مركبتك"}
        </p>
      </div>

      <div className="px-5 mt-4">
        <MapView
          height={260}
          driver={location}
          userLocation={location}
          follow={online}
          showAccuracy
          showRecenter
          ridePins={pendingRides.map((ride) => ({
            id: ride.id,
            lat: ride.pickup_lat,
            lng: ride.pickup_lng,
            label: formatEgp(ride.fare),
            ride,
          }))}
          onRidePinClick={(pin) => {
            const el = document.getElementById(`pending-ride-${pin?.id}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      </div>

      {activeRide && (
        <button
          onClick={() => navigate("/captain/ride")}
          className="mx-5 mt-4 rounded-2xl bg-brand-600 text-white p-4 text-right"
        >
          <p className="text-[12px] text-white/80">رحلة نشطة</p>
          <p className="font-extrabold text-[15px] mt-0.5">
            {statusLabel(activeRide.status)} · {activeRide.pickup_address || "نقطة الانطلاق"}
          </p>
        </button>
      )}

      <div className="px-5 mt-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-extrabold text-[15px]">الطلبات المتاحة</p>
          <span className="text-[12px] text-ink/45">{pendingRides.length} طلب</span>
        </div>

        {(error || localError) && (
          <p className="text-red-500 text-[13px] mb-3">{localError || error}</p>
        )}

        {!online && (
          <p className="text-[13px] text-ink/50 bg-white rounded-2xl p-4">
            حوّل حالتك إلى متصل لعرض الرحلات المعلقة من نوع مركبتك.
          </p>
        )}

        {online && pendingRides.length === 0 && (
          <p className="text-[13px] text-ink/50 bg-white rounded-2xl p-4">
            لا توجد رحلات معلقة مطابقة لنوع مركبتك حالياً.
          </p>
        )}

        <div className="space-y-3">
          {pendingRides.map((ride) => {
            const km =
              ride.distance_km ||
              haversineKm(
                { lat: ride.pickup_lat, lng: ride.pickup_lng },
                { lat: ride.dropoff_lat, lng: ride.dropoff_lng }
              );
            const toPickup =
              location?.lat != null && ride.pickup_lat != null
                ? haversineKm(location, { lat: ride.pickup_lat, lng: ride.pickup_lng })
                : null;
            return (
              <div id={`pending-ride-${ride.id}`} key={ride.id} className="rounded-2xl bg-white shadow-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] truncate">
                      {ride.pickup_address || "نقطة الانطلاق"}
                    </p>
                    <p className="text-[12px] text-ink/50 mt-1 truncate">
                      إلى {ride.dropoff_address || "الوجهة"}
                    </p>
                  </div>
                  <span className="text-[12px] font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg shrink-0">
                    {TYPE_LABELS[ride.ride_type] || ride.ride_type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-ink/55">
                  <span>{formatDistance(Number(km) || 0)}</span>
                  <span>{formatEgp(ride.fare)}</span>
                  {toPickup != null && <span>يبعد {formatDistance(toPickup)}</span>}
                </div>
                <button
                  disabled={busyId === ride.id || Boolean(activeRide)}
                  onClick={() => handleAccept(ride)}
                  className="w-full h-11 rounded-xl bg-brand-600 text-white font-bold text-[13px] disabled:opacity-40"
                >
                  {busyId === ride.id ? "جاري القبول..." : "قبول الطلب"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function statusLabel(status) {
  if (status === "accepted") return "في الطريق للراكب";
  if (status === "arrived") return "وصلت لموقع الراكب";
  if (status === "in_progress") return "الرحلة جارية";
  return status;
}
