import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PrimaryButton, TextField } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { accountHomePath } from "../../lib/session";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, refreshAccount } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    const { data, error: authError } = await signInWithEmail(email, password);
    if (authError) {
      setLoading(false);
      setError(authError.message || "البريد الإلكتروني أو كلمة السر غير صحيحة");
      return;
    }
    if (!data?.session) {
      setLoading(false);
      setError("تعذر استعادة الجلسة. حاول مرة أخرى");
      return;
    }
    const type = await refreshAccount(data.session);
    setLoading(false);
    navigate(accountHomePath(type), { replace: true });
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-10">
      <h1 className="text-2xl font-extrabold">تسجيل الدخول</h1>
      <p className="text-ink/55 text-[14px] mt-1">أهلاً بعودتك، سجّل دخولك بالبريد أو رقم الهاتف</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 flex-1 flex flex-col">
        <TextField
          label="البريد الإلكتروني أو رقم الهاتف"
          name="email"
          type="text"
          inputMode="email"
          autoComplete="username"
          dir="ltr"
          placeholder="name@example.com أو 01xxxxxxxxx"
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
        {notice ? <p className="text-brand-600 text-[13px]">{notice}</p> : null}
        {error ? <p className="text-red-500 text-[13px]">{error}</p> : null}

        <button
          type="button"
          onClick={() => navigate("/forgot-password")}
          className="text-brand-600 text-[13px] font-semibold self-start"
        >
          نسيت كلمة السر؟
        </button>

        <div className="flex-1" />

        <PrimaryButton type="submit" disabled={loading || !email.trim() || !password}>
          {loading ? "جاري الدخول..." : "تسجيل الدخول"}
        </PrimaryButton>

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
