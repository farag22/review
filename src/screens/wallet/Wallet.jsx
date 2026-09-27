import React, { useEffect, useState } from "react";
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

export default function Wallet() {
  const { user } = useAuth();
  const { paymentMethod, setPaymentMethod } = useRide();
  const [balance, setBalance] = useState(0);
  const [methods, setMethods] = useState([]);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("card");
  const [newLabel, setNewLabel] = useState("");

  async function loadWallet() {
    if (!user) return;
    const [{ data: wallet }, { data: pm }] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("payment_methods").select("*").eq("user_id", user.id).order("created_at"),
    ]);
    setBalance(Number(wallet?.balance) || 0);
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

  async function topUp() {
    const value = Number(amount);
    if (!user || !Number.isFinite(value) || value <= 0) {
      setError("أدخل مبلغًا صحيحًا");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const next = Number((balance + value).toFixed(2));
      const { error: werr } = await supabase
        .from("wallets")
        .upsert({ user_id: user.id, balance: next, updated_at: new Date().toISOString() });
      if (werr) throw werr;
      await supabase.from("wallet_txns").insert({
        user_id: user.id,
        amount: value,
        kind: "topup",
        note: "شحن محفظة",
      });
      setBalance(next);
      setAmount("");
      setPaymentMethod("wallet");
    } catch (err) {
      setError(err.message || "تعذر الشحن");
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
          <div className="mt-4 flex gap-2">
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="المبلغ"
              className="flex-1 h-10 rounded-full px-4 text-ink text-[13px]"
            />
            <button
              onClick={topUp}
              disabled={loading}
              className="bg-white text-brand-700 text-[13px] font-bold px-4 py-2 rounded-full"
            >
              {loading ? "..." : "شحن"}
            </button>
          </div>
        </div>
      </div>

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

      {error && <p className="px-5 text-red-500 text-[13px] mt-3">{error}</p>}

      <div className="flex-1" />
      <div className="px-5 py-5">
        <PrimaryButton onClick={addMethod} disabled={adding} className="flex items-center justify-center gap-2">
          <PlusIcon size={16} color="#fff" /> {adding ? "جاري الإضافة..." : "إضافة طريقة دفع"}
        </PrimaryButton>
      </div>
    </div>
  );
}
