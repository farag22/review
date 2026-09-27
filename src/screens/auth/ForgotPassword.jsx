import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton, TextField } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { sendResetCode } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await sendResetCode(phone);
    setLoading(false);
    navigate("/verify-code", { state: { phone } });
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="نسيت كلمة السر؟" subtitle="أدخل رقم هاتفك وسنرسل لك كود التفعيل" />
      <form onSubmit={handleSubmit} className="px-6 mt-4 flex-1 flex flex-col gap-4">
        <TextField
          label="رقم الهاتف"
          type="tel"
          placeholder="01xxxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <div className="flex-1" />
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "جاري الإرسال..." : "إرسال الكود"}
        </PrimaryButton>
      </form>
    </div>
  );
}
