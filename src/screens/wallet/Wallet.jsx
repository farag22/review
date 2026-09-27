import React, { useEffect, useState } from "react";
import { ScreenHeader, PrimaryButton } from "../../components/ui";
import { WalletIcon, PlusIcon } from "../../components/Icons";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useRide } from "../../context/RideContext";

export default function Wallet() {
  const { user } = useAuth();
  const { paymentMethod, setPaymentMethod } = useRide();
  const [balance, setBalance] = useState(6700);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setBalance(data.balance);
      });
  }, [user]);

  const methods = [
    { id: "cash", label: "نقدًا", sub: "ادفع مباشرة للسائق" },
    { id: "bank", label: "بنكك", sub: "تحويل للحساب" },
    { id: "card", label: "بطاقة فيزا", sub: "**** 2340 — تنتهي 01/28" },
  ];

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
            {balance.toLocaleString("ar-EG")} <span className="text-base font-semibold">ج.م</span>
          </p>
          <button className="mt-4 bg-white text-brand-700 text-[13px] font-bold px-4 py-2 rounded-full">
            شحن المحفظة
          </button>
        </div>
      </div>

      <div className="px-5 mt-6">
        <p className="text-[13px] font-bold text-ink/60 mb-3">طرق الدفع</p>
        <div className="space-y-2">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setPaymentMethod(m.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border ${
                paymentMethod === m.id ? "border-brand-500 bg-brand-50" : "border-black/10 bg-white"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center">
                <WalletIcon size={16} />
              </div>
              <div className="flex-1 text-right">
                <p className="font-semibold text-[13px]">{m.label}</p>
                <p className="text-[11px] text-ink/45">{m.sub}</p>
              </div>
              {paymentMethod === m.id && (
                <span className="w-4 h-4 rounded-full bg-brand-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />
      <div className="px-5 py-5">
        <PrimaryButton className="flex items-center justify-center gap-2">
          <PlusIcon size={16} color="#fff" /> إضافة طريقة دفع
        </PrimaryButton>
      </div>
    </div>
  );
}
