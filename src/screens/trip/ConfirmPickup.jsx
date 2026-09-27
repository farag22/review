import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../../components/MapView";
import { PrimaryButton } from "../../components/ui";
import { PhoneCallIcon, ChatIcon } from "../../components/Icons";
import { useRide } from "../../context/RideContext";
import { haversineKm } from "../../lib/geo";

export default function ConfirmPickup() {
  const navigate = useNavigate();
  const { pickup, destination, driver, refreshDriver, activeRide, updateRideStatus, cancelRide, route } = useRide();
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeRide?.driver_id && !driver) refreshDriver(activeRide.driver_id);
  }, [activeRide?.driver_id, driver, refreshDriver]);

  const eta = driver?.lat && pickup?.lat
    ? Math.max(1, Math.round((haversineKm(driver, pickup) / 28) * 60))
    : activeRide?.duration_min
      ? Math.max(2, Math.round(activeRide.duration_min * 0.2))
      : 5;

  async function startTrip() {
    setError("");
    try {
      await updateRideStatus("in_progress");
      navigate("/trip-progress");
    } catch (err) {
      setError(err.message || "تعذر بدء الرحلة");
    }
  }

  async function handleCancel() {
    await cancelRide();
    navigate("/choose-ride");
  }

  const name = driver?.full_name || "جاري تحديد السائق";
  const car = [driver?.car_model, driver?.plate_number].filter(Boolean).join(" · ");

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative flex-1">
        <MapView height="100%" pickup={pickup} destination={destination} driver={driver} path={route?.path} />
      </div>

      <div className="bg-white rounded-t-3xl -mt-6 px-5 pt-5 pb-6 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-extrabold text-[15px]">
              {driver ? "السائق في الطريق إليك" : "بانتظار تعيين سائق"}
            </p>
            <p className="text-ink/50 text-[12px] mt-0.5">يصل خلال {eta} دقائق</p>
          </div>
          <span className="text-brand-600 font-extrabold text-[15px]">{eta} د</span>
        </div>

        <div className="rounded-2xl bg-sand p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700">
            {name[0]}
          </div>
          <div className="flex-1">
            <p className="font-bold text-[14px]">{name}</p>
            <p className="text-[12px] text-ink/50">
              {car || "سيتم عرض بيانات السيارة عند التعيين"}
              {driver?.rating ? ` · ★ ${driver.rating}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {driver?.phone ? (
              <a
                href={`tel:${driver.phone}`}
                className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center"
              >
                <PhoneCallIcon size={16} />
              </a>
            ) : (
              <button className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center" disabled>
                <PhoneCallIcon size={16} />
              </button>
            )}
            <button className="w-10 h-10 rounded-full bg-sand border border-black/10 flex items-center justify-center" disabled>
              <ChatIcon size={16} />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-black/10 p-3">
          <p className="text-[12px] text-ink/45">نقطة الالتقاء</p>
          <p className="text-[13px] font-semibold mt-0.5">{pickup?.label || "الموقع الحالي"}</p>
        </div>

        {error && <p className="text-red-500 text-[13px]">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCancel}
            className="h-12 rounded-2xl border border-red-200 text-red-500 font-bold text-[13px]"
          >
            إلغاء الطلب
          </button>
          <PrimaryButton onClick={startTrip} className="h-12" disabled={!driver}>
            بدء الرحلة
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
