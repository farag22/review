import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton, TextField } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useCaptain } from "../../context/CaptainContext";
import { CAPTAIN_DEBT_LIMIT, VODAFONE_CASH } from "../../lib/finance";
import { formatEgp } from "../../lib/geo";

const REQUEST_STATUS = {
  pending: { label: "قيد المراجعة", className: "bg-amber-50 text-amber-700" },
  approved: { label: "تمت الموافقة", className: "bg-brand-50 text-brand-700" },
  rejected: { label: "مرفوض", className: "bg-red-50 text-red-600" },
};

export default function CaptainDebt() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { debt, locked, debtRequests, loadDebtRequests, submitDebtPayment, loadDriverDebt } = useCaptain();
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    loadDebtRequests();
    loadDriverDebt();
  }, [user?.id]);

  useEffect(() => {
    if (debt > 0) setAmount(String(Math.ceil(debt)));
  }, [debt]);

  async function uploadReceipt() {
    if (!receiptFile || !user?.id) return null;
    const ext = String(receiptFile.name || "jpg").split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("wallet-receipts").upload(path, receiptFile, {
      upsert: false,
      contentType: receiptFile.type || "image/jpeg",
    });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("wallet-receipts").getPublicUrl(path);
    return data?.publicUrl || null;
  }

  function copyCashNumber() {
    navigator.clipboard?.writeText(VODAFONE_CASH).catch(() => {});
    setSuccess("تم نسخ رقم فودافون كاش");
  }

  async function submit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("أدخل مبلغًا صحيحًا");
      return;
    }
    const phone = String(phoneNumber || "").replace(/\D/g, "");
    if (phone.length < 10) {
      setError("أدخل رقم التحويل المستخدم في فودافون كاش");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const receiptUrl = await uploadReceipt();
      await submitDebtPayment({ amount: value, phoneNumber: phone, receiptUrl });
      setAmount("");
      setPhoneNumber("");
      setReceiptFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setSuccess("تم إرسال طلب السداد وسيُخصم من مديونيتك فور موافقة الإدارة");
    } catch (err) {
      setError(err.message || "تعذر إرسال طلب السداد");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="سداد المديونية" subtitle="حوّل المبلغ ثم ارفع الإيصال للمراجعة" />

      <div className="px-5">
        <div className={`rounded-2xl p-5 text-white ${locked ? "bg-red-600" : "bg-gradient-to-l from-brand-700 to-brand-500"}`}>
          <p className="text-white/80 text-[12px]">إجمالي المديونية المستحقة</p>
          <p className="text-3xl font-extrabold mt-1">{formatEgp(debt)}</p>
          <p className="text-white/80 text-[12px] mt-2">
            الحد الأقصى {formatEgp(CAPTAIN_DEBT_LIMIT)} {locked ? "· الحساب مقفول حالياً" : ""}
          </p>
          <p className="text-white/80 text-[12px] mt-3">حوّل فودافون كاش إلى</p>
          <button
            type="button"
            onClick={copyCashNumber}
            className="mt-1 text-[15px] font-extrabold tracking-wide"
            dir="ltr"
          >
            {VODAFONE_CASH}
          </button>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-3">
        <p className="text-[13px] font-bold text-ink/60">طلب سداد</p>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="المبلغ المسدد"
          className="w-full h-12 rounded-xl bg-white border border-black/10 px-4 text-[14px]"
        />
        <TextField
          placeholder="رقم التحويل من فودافون كاش"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          dir="ltr"
          inputMode="tel"
        />
        <label className="block">
          <span className="block text-[12px] text-ink/50 mb-1.5">صورة إيصال التحويل (اختياري)</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            className="w-full text-[12px] file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:font-bold"
          />
        </label>
        <PrimaryButton onClick={submit} disabled={loading}>
          {loading ? "جاري إرسال الطلب..." : "إرسال طلب السداد"}
        </PrimaryButton>
      </div>

      {success && <p className="px-5 text-brand-700 text-[13px] mt-3">{success}</p>}
      {error && <p className="px-5 text-red-500 text-[13px] mt-3">{error}</p>}

      {debtRequests.length > 0 && (
        <div className="px-5 mt-6 pb-6 space-y-2">
          <p className="text-[13px] font-bold text-ink/60">طلبات السداد</p>
          {debtRequests.map((req) => {
            const meta = REQUEST_STATUS[req.status] || REQUEST_STATUS.pending;
            return (
              <div key={req.id} className="rounded-2xl bg-white border border-black/5 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[13px]">{formatEgp(req.amount)}</p>
                  <p className="text-[11px] text-ink/45 mt-0.5" dir="ltr">{req.phone_number || "—"}</p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${meta.className}`}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex-1" />
      <div className="px-5 pb-6">
        <button
          onClick={() => navigate("/captain/dashboard")}
          className="w-full h-12 rounded-xl border border-black/10 text-ink/70 font-bold text-[13px]"
        >
          العودة للوحة التحكم
        </button>
      </div>
    </div>
  );
}
