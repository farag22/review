import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { accountHomePath, accountLabel } from "../../lib/session";

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, driver, accountType, updateProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name || user?.user_metadata?.full_name || "");
    setPhone(profile?.phone || driver?.phone || user?.user_metadata?.phone || "");
  }, [profile, driver, user]);

  const email = user?.email || "";
  const typeLabel = accountLabel(accountType);
  const initial = (fullName || email || "م").trim().charAt(0);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved("");
    setBusy(true);
    try {
      await updateProfile({ fullName: fullName.trim(), phone });
      setSaved("تم حفظ بياناتك بنجاح");
    } catch (err) {
      setError(err.message || "تعذر حفظ البيانات");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    navigate("/welcome", { replace: true });
  }

  return (
    <div className="relative flex-1 min-h-full overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#064e3b_0%,_transparent_52%),radial-gradient(ellipse_at_bottom,_#0f172a_0%,_#020617_70%)]" />
      <div className="absolute -top-16 -left-10 w-56 h-56 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute bottom-24 -right-16 w-64 h-64 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative z-10 flex-1 min-h-full flex flex-col px-5 pt-6 pb-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(accountHomePath(accountType))}
            className="h-10 px-4 rounded-full backdrop-blur-md bg-slate-900/60 border border-white/10 text-[13px] font-bold"
          >
            رجوع
          </button>
          <span className="text-[12px] font-bold text-emerald-300/80">{typeLabel}</span>
        </div>

        <div className="mt-6 rounded-3xl backdrop-blur-md bg-slate-900/60 border border-white/10 p-5 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center text-2xl font-extrabold text-emerald-300">
            {initial}
          </div>
          <h1 className="mt-3 text-[22px] font-extrabold">{fullName || "الملف الشخصي"}</h1>
          <p className="mt-1 text-[13px] text-white/60" dir="ltr">
            {email || "بدون بريد"}
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="mt-4 rounded-3xl backdrop-blur-md bg-slate-900/60 border border-white/10 p-5 space-y-4"
        >
          <Field label="الاسم بالكامل">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-12 rounded-xl bg-slate-950/50 border border-white/10 px-4 text-[14px] text-white placeholder:text-white/30"
              placeholder="اكتب اسمك"
              required
            />
          </Field>
          <Field label="البريد الإلكتروني">
            <input
              value={email}
              readOnly
              dir="ltr"
              className="w-full h-12 rounded-xl bg-slate-950/40 border border-white/10 px-4 text-[14px] text-white/70"
            />
          </Field>
          <Field label="رقم الهاتف">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              inputMode="tel"
              className="w-full h-12 rounded-xl bg-slate-950/50 border border-white/10 px-4 text-[14px] text-white placeholder:text-white/30"
              placeholder="01xxxxxxxxx"
            />
          </Field>
          <Field label="نوع الحساب">
            <div className="h-12 rounded-xl bg-slate-950/40 border border-white/10 px-4 flex items-center justify-between text-[14px]">
              <span>{typeLabel}</span>
              {driver?.plate_number ? (
                <span className="text-white/50 text-[12px]">{driver.plate_number}</span>
              ) : null}
            </div>
          </Field>

          {error && <p className="text-red-400 text-[13px]">{error}</p>}
          {saved && <p className="text-emerald-300 text-[13px]">{saved}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[15px] transition-colors disabled:opacity-50"
          >
            {busy ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={busy}
          className="mt-4 w-full h-14 rounded-2xl border border-red-400/40 text-red-300 bg-red-500/10 font-bold text-[15px]"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-right">
      <span className="block text-[12px] text-white/55 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
