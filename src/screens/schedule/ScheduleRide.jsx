import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton, Chip } from "../../components/ui";
import { useRide } from "../../context/RideContext";

const DAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ScheduleRide() {
  const navigate = useNavigate();
  const { destination, requestRide, selectedRide, setSelectedRide, rideOptions } = useRide();
  const [tab, setTab] = useState("pickup");
  const [dayOffset, setDayOffset] = useState(0);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = startOfToday();
        d.setDate(d.getDate() + i);
        return d;
      }),
    []
  );

  const times = useMemo(() => {
    const slots = [];
    for (let h = 6; h <= 22; h += 1) {
      slots.push({ hour: h, minute: 0, label: formatTime(h, 0) });
      slots.push({ hour: h, minute: 30, label: formatTime(h, 30) });
    }
    return slots;
  }, []);

  const monthLabel = days[dayOffset].toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

  async function confirm() {
    setError("");
    if (!destination?.lat) {
      navigate("/set-destination");
      return;
    }
    if (!selectedRide && rideOptions[0]) setSelectedRide(rideOptions[0]);
    const when = new Date(days[dayOffset]);
    when.setHours(hour, minute, 0, 0);
    if (when.getTime() < Date.now() + 10 * 60 * 1000) {
      setError("اختر موعدًا بعد 10 دقائق على الأقل");
      return;
    }
    setLoading(true);
    try {
      await requestRide({ scheduledAt: when.toISOString() });
      navigate("/home");
    } catch (err) {
      setError(err.message || "تعذر جدولة الرحلة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="جدولة الرحلة" subtitle="اختر موعد الانطلاق أو الوصول" />

      <div className="px-5 flex gap-2">
        <Chip active={tab === "pickup"} onClick={() => setTab("pickup")}>وقت الانطلاق</Chip>
        <Chip active={tab === "dropoff"} onClick={() => setTab("dropoff")}>وقت الوصول</Chip>
      </div>

      <div className="px-5 mt-5">
        <p className="text-center font-bold text-[14px] mb-3">{monthLabel}</p>
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((d, i) => (
            <span key={`n-${i}`} className="text-[10px] text-ink/40">{DAYS_AR[d.getDay()]}</span>
          ))}
          {days.map((d, i) => (
            <button
              key={d.toISOString()}
              onClick={() => setDayOffset(i)}
              className={`h-10 rounded-full text-[13px] font-semibold ${
                dayOffset === i ? "bg-brand-600 text-white" : "text-ink/70"
              }`}
            >
              {d.getDate()}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6">
        <p className="text-[13px] font-bold text-ink/60 mb-3">الأوقات المتاحة</p>
        <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto">
          {times.map((t) => (
            <button
              key={t.label}
              onClick={() => {
                setHour(t.hour);
                setMinute(t.minute);
              }}
              className={`h-12 rounded-xl text-[14px] font-semibold border ${
                hour === t.hour && minute === t.minute
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white border-black/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="px-5 text-red-500 text-[13px] mt-3">{error}</p>}

      <div className="flex-1" />
      <div className="px-5 py-5 space-y-2">
        <PrimaryButton onClick={confirm} disabled={loading}>
          {loading ? "جاري الحفظ..." : "تأكيد الجدولة"}
        </PrimaryButton>
        <button
          onClick={() => navigate(destination?.lat ? "/choose-ride" : "/set-destination")}
          className="w-full text-center text-ink/50 text-[13px] py-2"
        >
          اطلب الرحلة الآن بدلًا من ذلك
        </button>
      </div>
    </div>
  );
}

function formatTime(hour, minute) {
  const suffix = hour < 12 ? "ص" : "م";
  const h12 = hour % 12 || 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}
