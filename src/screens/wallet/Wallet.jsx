import React, { useEffect, useRef, useState } from "react";
import { ScreenHeader, PrimaryButton, TextField } from "../../components/ui";
import { WalletIcon, PlusIcon } from "../../components/Icons";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useRide } from "../../context/RideContext";
import { formatEgp } from "../../lib/geo";

const TYPE_META = {
  cash: { label: "نقدًا", sub: "ادفع مباشرة للسائق" },
  wallet: { label: "المحفظة", sub: "خصم من رصيدك" },
  card: { label: "بطاقة", sub: "بطاقة بنكية محفوظة" },
  bank: { label: "تحويل بنكي", sub: "تحويل للحساب" },
};

const VODAFONE_CASH = "01003454288";

const REQUEST_STATUS = {
  pending: { label: "قيد المراجعة", className: "bg-amber-50 text-amber-700" },
  approved: { label: "تمت الموافقة", className: "bg-brand-50 text-brand-700" },
  rejected: { label: "مرفوض", className: "bg-red-50 text-red-600" },
};

export default function Wallet() {
  const { user } = useAuth();
  const { paymentMethod, setPaymentMethod } = useRide();
  const [balance, setBalance] = useState(0);
  const [methods, setMethods] = useState([]);
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("card");
  const [newLabel, setNewLabel] = useState("");
  const fileRef = useRef(null);

  async function loadWallet() {
    if (!user) return;
    const [{ data: wallet }, { data: pm }, { data: reqs }] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("payment_methods").select("*").eq("user_id", user.id).order("created_at"),
      supabase
        .from("wallet_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    setBalance(Number(wallet?.balance) || 0);
    setRequests(reqs || []);
    if (pm?.length) {
      setMethods(pm);
      const def = pm.find((m) => m.is_default);
      if (def) setPaymentMethod(def.type);
    } else {
      setMethods([{ id: "cash", type: "cash", label: "نقدًا", is_default: true }]);
    }
  }

  useEffect(() => {
    loadWallet();
  }, [user]);

  async function selectMethod(method) {
    setPaymentMethod(method.type);
    if (!user || !method.id || method.id === "cash") return;
    await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("payment_methods").update({ is_default: true }).eq("id", method.id);
  }

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

  async function submitTopUp() {
    const value = Number(amount);
    if (!user || !Number.isFinite(value) || value <= 0) {
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
      const { error: reqErr } = await supabase.from("wallet_requests").insert({
        user_id: user.id,
        amount: value,
        phone_number: phone,
        receipt_image_url: receiptUrl,
        status: "pending",
      });
      if (reqErr) throw reqErr;
      setAmount("");
      setPhoneNumber("");
      setReceiptFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setSuccess("طلبك قيد المراجعة من الإدارة وسيتم إضافة الرصيد فور التحقق");
      await loadWallet();
    } catch (err) {
      setError(err.message || "تعذر إرسال طلب الشحن");
    } finally {
      setLoading(false);
    }
  }

  async function addMethod() {
    if (!user) return;
    setAdding(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("payment_methods")
        .insert({
          user_id: user.id,
          type: newType,
          label: newLabel || TYPE_META[newType]?.label || newType,
          is_default: false,
        })
        .select()
        .single();
      if (err) throw err;
      setMethods((list) => [...list, data]);
      setNewLabel("");
    } catch (err) {
      setError(err.message || "تعذر إضافة طريقة الدفع");
    } finally {
      setAdding(false);
    }
  }

  function copyCashNumber() {
    navigator.clipboard?.writeText(VODAFONE_CASH).catch(() => {});
    setSuccess("تم نسخ رقم فودافون كاش");
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="المحفظة" />

      <div className="px-5">
        <div className="rounded-2xl bg-gradient-to-l from-brand-700 to-brand-500 text-white p-5">
          <div className="flex items-center gap-2 text-white/80 text-[12px]">
            <WalletIcon size={16} color="#fff" />
            <span>رصيد المحفظة</span>
          </div>
          <p className="text-3xl font-extrabold mt-2">
            {formatEgp(balance).replace(" ج.م", "")} <span className="text-base font-semibold">ج.م</span>
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
          <p className="text-white/70 text-[11px] mt-1">اضغط لنسخ الرقم ثم أرسل إيصال التحويل للمراجعة</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-3">
        <p className="text-[13px] font-bold text-ink/60">طلب شحن المحفظة</p>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="المبلغ"
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
        <PrimaryButton onClick={submitTopUp} disabled={loading}>
          {loading ? "جاري إرسال الطلب..." : "إرسال طلب الشحن"}
        </PrimaryButton>
      </div>

      {success && <p className="px-5 text-brand-700 text-[13px] mt-3">{success}</p>}
      {error && <p className="px-5 text-red-500 text-[13px] mt-3">{error}</p>}

      {requests.length > 0 && (
        <div className="px-5 mt-6 space-y-2">
          <p className="text-[13px] font-bold text-ink/60">طلبات الشحن</p>
          {requests.map((req) => {
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

      <div className="px-5 mt-6">
        <p className="text-[13px] font-bold text-ink/60 mb-3">طرق الدفع</p>
        <div className="space-y-2">
          {methods.map((m) => {
            const meta = TYPE_META[m.type] || { label: m.label, sub: m.type };
            return (
              <button
                key={m.id}
                onClick={() => selectMethod(m)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border ${
                  paymentMethod === m.type ? "border-brand-500 bg-brand-50" : "border-black/10 bg-white"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center">
                  <WalletIcon size={16} />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-semibold text-[13px]">{m.label || meta.label}</p>
                  <p className="text-[11px] text-ink/45">{m.last4 ? `**** ${m.last4}` : meta.sub}</p>
                </div>
                {paymentMethod === m.type && (
                  <span className="w-4 h-4 rounded-full bg-brand-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-2">
        <p className="text-[13px] font-bold text-ink/60">إضافة طريقة دفع</p>
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          className="w-full h-12 rounded-xl bg-white border border-black/10 px-3 text-[14px]"
        >
          <option value="card">بطاقة</option>
          <option value="wallet">المحفظة</option>
          <option value="bank">تحويل بنكي</option>
          <option value="cash">نقدًا</option>
        </select>
        <TextField
          placeholder="وصف اختياري (مثل آخر 4 أرقام)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
      </div>

      <div className="flex-1" />
      <div className="px-5 py-5">
        <PrimaryButton onClick={addMethod} disabled={adding} className="flex items-center justify-center gap-2">
          <PlusIcon size={16} color="#fff" /> {adding ? "جاري الإضافة..." : "إضافة طريقة دفع"}
        </PrimaryButton>
      </div>
    </div>
  );
}
