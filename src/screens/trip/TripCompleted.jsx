import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton, Stars } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useRide } from "../../context/RideContext";

export default function TripCompleted() {
  const navigate = useNavigate();
  const { destination, selectedRide, activeRide, setActiveRide } = useRide();
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    if (activeRide?.id && !String(activeRide.id).startsWith("local-")) {
      await supabase
        .from("rides")
        .update({ status: "completed", rider_rating: rating })
        .eq("id", activeRide.id);
    }
    setLoading(false);
    setActiveRide(null);
    navigate("/home");
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-8">
      <h1 className="text-xl font-extrabold text-center">وصلت إلى وجهتك</h1>
      <p className="text-ink/50 text-[13px] text-center mt-1">قيّم رحلتك مع عمر علي</p>

      <div className="mt-8 rounded-2xl bg-white shadow-card p-5 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center font-bold text-2xl text-brand-700">
          ع
        </div>
        <p className="font-bold text-[15px]">عمر علي</p>
        <p className="text-ink/45 text-[12px]">هوندا سيفيك · ق ل ب 5300</p>
        <Stars value={rating} onChange={setRating} />
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 p-4 space-y-2">
        <Row label="الوجهة" value={destination?.label || "—"} />
        <Row label="نوع الرحلة" value={selectedRide?.label || "—"} />
        <Row label="طريقة الدفع" value="نقدًا" />
        <div className="border-t border-black/5 pt-2 flex items-center justify-between">
          <span className="text-[13px] font-bold">الإجمالي</span>
          <span className="text-[16px] font-extrabold text-brand-700">
            {(selectedRide?.price || 0).toLocaleString("ar-EG")} ج.م
          </span>
        </div>
      </div>

      <div className="flex-1" />
      <div className="pb-6 pt-6">
        <PrimaryButton onClick={handleSubmit} disabled={rating === 0 || loading}>
          {loading ? "جاري الإرسال..." : "إرسال التقييم"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-ink/50">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
