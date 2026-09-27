import React from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../../components/MapView";
import { PrimaryButton } from "../../components/ui";
import { PhoneCallIcon, ChatIcon } from "../../components/Icons";
import { useRide } from "../../context/RideContext";

const DRIVER = {
  name: "عمر علي",
  car: "هوندا سيفيك، رمادي",
  plate: "ق ل ب 5300",
  rating: 4.9,
};

export default function ConfirmPickup() {
  const navigate = useNavigate();
  const { pickup } = useRide();

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative flex-1">
        <MapView height="100%" />
      </div>

      <div className="bg-white rounded-t-3xl -mt-6 px-5 pt-5 pb-6 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-extrabold text-[15px]">السائق في الطريق إليك</p>
            <p className="text-ink/50 text-[12px] mt-0.5">يصل خلال 5 دقائق</p>
          </div>
          <span className="text-brand-600 font-extrabold text-[15px]">5 د</span>
        </div>

        <div className="rounded-2xl bg-sand p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700">
            {DRIVER.name[0]}
          </div>
          <div className="flex-1">
            <p className="font-bold text-[14px]">{DRIVER.name}</p>
            <p className="text-[12px] text-ink/50">{DRIVER.car} · {DRIVER.plate}</p>
          </div>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center">
              <PhoneCallIcon size={16} />
            </button>
            <button className="w-10 h-10 rounded-full bg-sand border border-black/10 flex items-center justify-center">
              <ChatIcon size={16} />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-black/10 p-3">
          <p className="text-[12px] text-ink/45">نقطة الالتقاء</p>
          <p className="text-[13px] font-semibold mt-0.5">{pickup?.label || "الموقع الحالي"}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/choose-ride")}
            className="h-12 rounded-2xl border border-red-200 text-red-500 font-bold text-[13px]"
          >
            إلغاء الطلب
          </button>
          <PrimaryButton onClick={() => navigate("/trip-progress")} className="h-12">
            بدء الرحلة
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
