import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, PrimaryButton, TextField } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function CreateNewPassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) {
      setError("كلمة السر لازم تكون 6 حروف/أرقام على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمة السر غير متطابقة");
      return;
    }
    setError("");
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setError("حدث خطأ، حاول مرة أخرى");
      return;
    }
    navigate("/password-updated");
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScreenHeader title="إنشاء كلمة سر جديدة" subtitle="أنشئ كلمة سر جديدة لحسابك" />
      <form onSubmit={handleSubmit} className="px-6 mt-4 flex-1 flex flex-col gap-4">
        <TextField
          label="كلمة السر"
          type="password"
          placeholder="ادخل كلمة سر جديدة"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <TextField
          label="تأكيد كلمة السر"
          type="password"
          placeholder="أعد كتابة كلمة السر"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-[13px]">{error}</p>}
        <div className="flex-1" />
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ كلمة السر الجديدة"}
        </PrimaryButton>
      </form>
    </div>
  );
}
