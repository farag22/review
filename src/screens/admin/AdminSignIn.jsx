import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton, TextField } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { ensureAdminProfile, isAdminUser } from "../../lib/admin";

export default function AdminSignIn() {
  const navigate = useNavigate();
  const { signInWithEmail, refreshAccount } = useAuth();
  const [email, setEmail] = useState("Farag20014@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error: authError } = await signInWithEmail(email, password);
    if (authError) {
      setLoading(false);
      setError("البريد الإلكتروني أو كلمة السر غير صحيحة");
      return;
    }
    const user = data?.user;
    if (!user?.id) {
      setLoading(false);
      setError("تعذر تسجيل الدخول");
      return;
    }

    await ensureAdminProfile(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    setLoading(false);
    if (!isAdminUser(user, profile?.role)) {
      setError("هذا الحساب ليس حساب إدارة. استخدم Farag20014@gmail.com");
      return;
    }
    await refreshAccount(data?.session);
    navigate("/admin/dashboard");
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-10">
      <p className="text-[12px] font-bold text-brand-600 mb-2">إدارة</p>
      <h1 className="text-2xl font-extrabold">لوحة التحكم</h1>
      <p className="text-ink/55 text-[14px] mt-1">دخول المسؤول لمتابعة السائقين والرحلات والركاب</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 flex-1 flex flex-col">
        <TextField
          label="البريد الإلكتروني"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="كلمة السر"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="ادخل كلمة السر"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-[13px]">{error}</p>}
        <div className="flex-1" />
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "جاري الدخول..." : "دخول الإدارة"}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-center text-[12px] text-ink/40 pb-4"
        >
          العودة للرئيسية
        </button>
      </form>
    </div>
  );
}
