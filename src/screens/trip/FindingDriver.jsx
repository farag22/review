import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../../components/MapView";
import { useRide } from "../../context/RideContext";

export default function FindingDriver() {
  const navigate = useNavigate();
  const { pickup, destination, selectedRide } = useRide();

  useEffect(() => {
    // في الإنتاج: استمع realtime لتحديثات جدول rides (status = 'accepted')
    // عن طريق supabase.channel('rides').on('postgres_changes', ...)
    const t = setTimeout(() => navigate("/confirm-pickup"), 2500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative flex-1">
        <MapView height="100%">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-brand-600 animate-ping absolute" />
            <span className="w-4 h-4 rounded-full bg-brand-600" />
          </div>
        </MapView>
      </div>

      <div className="bg-white rounded-t-3xl -mt-6 px-6 pt-6 pb-8 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <p className="text-center font-extrabold text-[16px]">جاري البحث عن سائق قريب</p>
        <p className="text-center text-ink/50 text-[13px] mt-1">
          {selectedRide?.label || "رحلتك"} · {destination?.label || ""}
        </p>

        <div className="flex justify-center gap-2 my-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-brand-500"
              style={{ animation: `pulse 1.2s ${i * 0.2}s infinite ease-in-out` }}
            />
          ))}
        </div>

        <button
          onClick={() => navigate("/choose-ride")}
          className="w-full h-12 rounded-2xl border border-red-200 text-red-500 font-bold text-[14px]"
        >
          إلغاء الطلب
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: .3; transform: scale(.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
