import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton, TextField } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

const FALLBACK_TYPES = [
  { id: "economy", label: "اقتصادي" },
  { id: "comfort", label: "Comfort" },
  { id: "masseya", label: "Masseya" },
  { id: "tuktuk", label: "توك توك" },
  { id: "scooter", label: "سكوتر" },
];

export default function CaptainSignUp() {
  const navigate = useNavigate();
  const { signUpCaptain } = useAuth();
  const [rideTypes, setRideTypes] = useState(FALLBACK_TYPES);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    carModel: "",
    plateNumber: "",
    rideType: "economy",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("ride_types").select("id,label").then(({ data }) => {
      if (data?.length) setRideTypes(data);
    });
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("كلمة السر غير متطابقة");
      return;
    }
    if (form.password.length < 6) {
      setError("كلمة السر يجب ألا تقل عن 6 أحرف");
      return;
    }
    setLoading(true);
    const { data, error: signError } = await signUpCaptain(form);
    setLoading(false);
    if (signError) {
      setError(signError.message || "حدث خطأ، حاول مرة أخرى");
      return;
    }
    if (!data?.session) {
      setError("تم إنشاء الحساب. راجع بريدك لتأكيد الإيميل ثم سجّل الدخول");
      return;
    }
    navigate("/captain/dashboard");
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-10">
      <p className="text-[12px] font-bold text-brand-600 mb-2">كابتن</p>
      <h1 className="text-2xl font-extrabold">تسجيل سائق</h1>
      <p className="text-ink/55 text-[14px] mt-1">أنشئ حسابك واربطه بجدول السائقين لبدء استقبال الطلبات</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 flex-1 flex flex-col">
        <TextField
          label="الاسم بالكامل"
          placeholder="اكتب اسمك"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          required
        />
        <TextField
          label="البريد الإلكتروني"
          type="email"
          placeholder="captain@example.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
        />
        <TextField
          label="رقم الهاتف"
          type="tel"
          placeholder="01xxxxxxxxx"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          required
        />
        <TextField
          label="موديل المركبة"
          placeholder="هيونداي إلنترا"
          value={form.carModel}
          onChange={(e) => update("carModel", e.target.value)}
          required
        />
        <TextField
          label="رقم اللوحة"
          placeholder="ق ل ب 1204"
          value={form.plateNumber}
          onChange={(e) => update("plateNumber", e.target.value)}
          required
        />
        <label className="block">
          <span className="block text-[13px] text-ink/60 mb-1.5">نوع المركبة</span>
          <select
            className="w-full h-13 py-3.5 px-4 rounded-xl bg-white border border-black/10 text-[15px] focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            value={form.rideType}
            onChange={(e) => update("rideType", e.target.value)}
          >
            {rideTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="كلمة السر"
          type="password"
          placeholder="ادخل كلمة السر"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          required
        />
        <TextField
          label="تأكيد كلمة السر"
          type="password"
          placeholder="أعد كتابة كلمة السر"
          value={form.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-[13px]">{error}</p>}

        <div className="flex-1" />

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "جاري الإنشاء..." : "إنشاء حساب كابتن"}
        </PrimaryButton>

        <p className="text-center text-[13px] text-ink/55 pb-4">
          لديك حساب كابتن؟{" "}
          <button
            type="button"
            onClick={() => navigate("/captain/signin")}
            className="text-brand-600 font-bold"
          >
            تسجيل الدخول
          </button>
        </p>
      </form>
    </div>
  );
}
