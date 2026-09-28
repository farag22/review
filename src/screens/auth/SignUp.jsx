import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton, TextField } from "../../components/ui";
import { useAuth, resolveEmailAndPhone } from "../../context/AuthContext";

export default function SignUp() {
  const navigate = useNavigate();
  const { signUpWithEmail, refreshAccount } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    const identity = resolveEmailAndPhone(form.email, form.phone);
    if (!identity.email) {
      setError("أدخل بريدًا إلكترونيًا صحيحًا في خانة الإيميل");
      return;
    }
    setLoading(true);
    const { data, error } = await signUpWithEmail({
      ...form,
      email: identity.email,
      phone: identity.phone,
    });
    setLoading(false);
    if (error) {
      setError(error.message || "حدث خطأ، حاول مرة أخرى");
      return;
    }
    if (!data?.session) {
      setError("تم إنشاء الحساب. راجع بريدك لتأكيد الإيميل ثم سجّل الدخول");
      return;
    }
    await refreshAccount(data.session);
    navigate("/home");
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-10">
      <h1 className="text-2xl font-extrabold">إنشاء حساب</h1>
      <p className="text-ink/55 text-[14px] mt-1">أنشئ حسابك لتبدأ حجز رحلاتك في القليوبية</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 flex-1 flex flex-col">
        <TextField
          label="الاسم بالكامل"
          name="fullName"
          autoComplete="name"
          placeholder="اكتب اسمك"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          required
        />
        <TextField
          label="البريد الإلكتروني"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder="name@example.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
        />
        <TextField
          label="رقم الهاتف (اختياري)"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          placeholder="01xxxxxxxxx"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
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

        <p className="text-[11px] text-ink/45 leading-5">
          بالضغط على "إنشاء حساب" أنت توافق على شروط الاستخدام وسياسة الخصوصية
        </p>

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "جاري الإنشاء..." : "إنشاء حساب"}
        </PrimaryButton>

        <p className="text-center text-[13px] text-ink/55 pb-2">
          لديك حساب بالفعل؟{" "}
          <button
            type="button"
            onClick={() => navigate("/signin")}
            className="text-brand-600 font-bold"
          >
            تسجيل الدخول
          </button>
        </p>
      </form>
    </div>
  );
}
