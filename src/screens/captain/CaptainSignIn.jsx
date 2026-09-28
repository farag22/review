import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton, TextField } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

export default function CaptainSignIn() {
  const navigate = useNavigate();
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
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
    const userId = data?.user?.id;
    if (!userId) {
      setLoading(false);
      setError("تعذر تسجيل الدخول");
      return;
    }
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    setLoading(false);
    if (!driver) {
      setError("هذا الحساب ليس حساب كابتن. أنشئ حساب سائق أولاً");
      return;
    }
    navigate("/captain/dashboard");
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-10">
      <p className="text-[12px] font-bold text-brand-600 mb-2">كابتن</p>
      <h1 className="text-2xl font-extrabold">دخول السائق</h1>
      <p className="text-ink/55 text-[14px] mt-1">سجّل دخولك لقبول الرحلات وإدارة حالة الاتصال</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 flex-1 flex flex-col">
        <TextField
          label="البريد الإلكتروني"
          type="email"
          placeholder="captain@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="كلمة السر"
          type="password"
          placeholder="ادخل كلمة السر"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-[13px]">{error}</p>}

        <div className="flex-1" />

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "جاري الدخول..." : "دخول الكابتن"}
        </PrimaryButton>

        <p className="text-center text-[13px] text-ink/55 pb-2">
          ليس لديك حساب سائق؟{" "}
          <button
            type="button"
            onClick={() => navigate("/captain/signup")}
            className="text-brand-600 font-bold"
          >
            تسجيل كابتن
          </button>
        </p>
        <button
          type="button"
          onClick={() => navigate("/welcome")}
          className="text-center text-[12px] text-ink/40 pb-4"
        >
          العودة لتطبيق الراكب
        </button>
      </form>
    </div>
  );
}
