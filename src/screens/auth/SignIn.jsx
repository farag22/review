import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton, GhostButton, TextField } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function SignIn() {
  const navigate = useNavigate();
  const { signInWithPhone } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signInWithPhone(phone, password);
    setLoading(false);
    if (error) {
      setError("رقم الهاتف أو كلمة السر غير صحيحة");
      return;
    }
    navigate("/home");
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-10">
      <h1 className="text-2xl font-extrabold">تسجيل الدخول</h1>
      <p className="text-ink/55 text-[14px] mt-1">أهلاً بعودتك، سجّل دخولك لتطلب رحلتك</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 flex-1 flex flex-col">
        <TextField
          label="رقم الهاتف"
          type="tel"
          placeholder="01xxxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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

        <button
          type="button"
          onClick={() => navigate("/forgot-password")}
          className="text-brand-600 text-[13px] font-semibold self-start"
        >
          نسيت كلمة السر؟
        </button>

        <div className="flex-1" />

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "جاري الدخول..." : "تسجيل الدخول"}
        </PrimaryButton>

        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-black/10" />
          <span className="text-ink/40 text-[12px]">أو الدخول بواسطة</span>
          <div className="flex-1 h-px bg-black/10" />
        </div>

        <GhostButton type="button">Google</GhostButton>
        <GhostButton type="button">Facebook</GhostButton>
        <GhostButton type="button">Apple</GhostButton>

        <p className="text-center text-[13px] text-ink/55 pb-2">
          ليس لديك حساب؟{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-brand-600 font-bold"
          >
            إنشاء حساب
          </button>
        </p>
      </form>
    </div>
  );
}
