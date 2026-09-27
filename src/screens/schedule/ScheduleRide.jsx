import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton, Chip } from "../../components/ui";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const TIMES = ["5:20 ص", "5:40 ص", "5:41 م", "6:00 م"];

export default function ScheduleRide() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pickup");
  const [selectedDay, setSelectedDay] = useState(2);
  const [selectedTime, setSelectedTime] = useState("5:40 ص");

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="جدولة الرحلة" subtitle="اختر موعد الانطلاق أو الوصول" />

      <div className="px-5 flex gap-2">
        <Chip active={tab === "pickup"} onClick={() => setTab("pickup")}>وقت الانطلاق</Chip>
        <Chip active={tab === "dropoff"} onClick={() => setTab("dropoff")}>وقت الوصول</Chip>
      </div>

      <div className="px-5 mt-5">
        <p className="text-center font-bold text-[14px] mb-3">مايو 2026</p>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAYS.map((d, i) => (
            <span key={d} className="text-[10px] text-ink/40">{d[0]}</span>
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`h-10 rounded-full text-[13px] font-semibold ${
                selectedDay === i ? "bg-brand-600 text-white" : "text-ink/70"
              }`}
            >
              {12 + i}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6">
        <p className="text-[13px] font-bold text-ink/60 mb-3">الأوقات المتاحة</p>
        <div className="grid grid-cols-2 gap-3">
          {TIMES.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTime(t)}
              className={`h-12 rounded-xl text-[14px] font-semibold border ${
                selectedTime === t
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white border-black/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />
      <div className="px-5 py-5 space-y-2">
        <PrimaryButton onClick={() => navigate("/set-destination")}>تأكيد الجدولة</PrimaryButton>
        <button
          onClick={() => navigate("/choose-ride")}
          className="w-full text-center text-ink/50 text-[13px] py-2"
        >
          اطلب الرحلة الآن بدلًا من ذلك
        </button>
      </div>
    </div>
  );
}
