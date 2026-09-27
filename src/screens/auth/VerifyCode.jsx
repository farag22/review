import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton, PinInputs } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function VerifyCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";
  const { verifyResetCode, sendResetCode } = useAuth();
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(45);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  async function handleConfirm() {
    setError("");
    setLoading(true);
    const { error } = await verifyResetCode(email, code);
    setLoading(false);
    if (error) {
      setError("الكود غير صحيح، حاول مرة أخرى");
      return;
    }
    navigate("/create-new-password", { state: { email } });
  }

  async function handleResend() {
    await sendResetCode(email);
    setSeconds(45);
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader
        title="أدخل كود التحقق"
        subtitle={`تم إرسال كود التحقق إلى ${email || "بريدك الإلكتروني"}`}
      />
      <div className="px-6 mt-6 flex-1 flex flex-col gap-6">
        <PinInputs length={6} value={code} onChange={setCode} />
        {error && <p className="text-red-500 text-[13px] text-center">{error}</p>}

        <p className="text-center text-[13px] text-ink/50">
          {seconds > 0 ? (
            `إعادة الإرسال خلال 00:${String(seconds).padStart(2, "0")}`
          ) : (
            <button onClick={handleResend} className="text-brand-600 font-bold">
              إعادة إرسال الكود
            </button>
          )}
        </p>

        <div className="flex-1" />

        <PrimaryButton onClick={handleConfirm} disabled={code.length < 6 || loading}>
          {loading ? "جاري التأكيد..." : "تأكيد"}
        </PrimaryButton>
      </div>
    </div>
  );
}
