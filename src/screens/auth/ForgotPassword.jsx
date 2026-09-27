import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton, TextField } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { sendResetCode } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await sendResetCode(email);
    setLoading(false);
    if (error) {
      setError(error.message || "تعذر إرسال رابط إعادة التعيين");
      return;
    }
    navigate("/verify-code", { state: { email } });
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="نسيت كلمة السر؟" subtitle="أدخل بريدك الإلكتروني وسنرسل لك كود التفعيل" />
      <form onSubmit={handleSubmit} className="px-6 mt-4 flex-1 flex flex-col gap-4">
        <TextField
          label="البريد الإلكتروني"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-[13px]">{error}</p>}
        <div className="flex-1" />
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "جاري الإرسال..." : "إرسال الكود"}
        </PrimaryButton>
      </form>
    </div>
  );
}
