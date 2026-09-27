import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton } from "../../components/ui";
import { CarBadge, PinIcon } from "../../components/Icons";
import { useRide } from "../../context/RideContext";

export default function ConfirmRide() {
  const navigate = useNavigate();
  const { pickup, destination, selectedRide, rideOptions, setSelectedRide, requestRide } =
    useRide();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await requestRide();
    setLoading(false);
    navigate("/finding-driver");
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="تأكيد الرحلة" subtitle="راجع تفاصيل رحلتك قبل الطلب" />

      <div className="px-5">
        <div className="rounded-2xl bg-white shadow-card p-4 space-y-3">
          <Row label="من" value={pickup?.label} dotColor="#0b7350" />
          <div className="border-r-2 border-dashed border-black/10 h-4 mr-[7px]" />
          <Row label="إلى" value={destination?.label || "—"} dotColor="#d9534f" />
        </div>
      </div>

      <div className="px-5 mt-5">
        <p className="text-[13px] font-bold text-ink/60 mb-2">اختر الرحلة</p>
        <div className="space-y-2">
          {rideOptions.slice(0, 2).map((r) => {
            const active = selectedRide?.id === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRide(r)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border ${
                  active ? "border-brand-500 bg-brand-50" : "border-black/10 bg-white"
                }`}
              >
                <CarBadge size={38} />
                <div className="flex-1 text-right">
                  <p className="font-bold text-[13px]">{r.label}</p>
                  <p className="text-[11px] text-ink/45">{r.eta} دقيقة</p>
                </div>
                <p className="font-extrabold text-[13px]">{r.price.toLocaleString("ar-EG")} ج.م</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1" />

      <div className="px-5 py-4 space-y-2">
        <button
          onClick={() => navigate("/wallet")}
          className="w-full flex items-center justify-between text-[13px] text-ink/60 py-1"
        >
          <span>طريقة الدفع</span>
          <span className="font-semibold text-ink">نقدًا ›</span>
        </button>
        <PrimaryButton onClick={handleConfirm} disabled={loading}>
          {loading ? "جاري الطلب..." : "تأكيد الرحلة"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Row({ label, value, dotColor }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: dotColor }} />
      <div>
        <p className="text-[11px] text-ink/45">{label}</p>
        <p className="text-[14px] font-semibold">{value}</p>
      </div>
    </div>
  );
}
