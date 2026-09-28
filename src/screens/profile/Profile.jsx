import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { accountHomePath, accountLabel } from "../../lib/session";
import {
  ChevronIcon,
  HelpIcon,
  InboxIcon,
  LogoutIcon,
  PromoIcon,
  SafetyIcon,
  SettingsIcon,
  UserIcon,
  WalletIcon,
} from "../../components/Icons";

const PANEL = {
  home: "home",
  walletHint: "wallet",
  help: "help",
  inbox: "inbox",
  safety: "safety",
  promos: "promos",
  settings: "settings",
  account: "account",
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, driver, accountType, updateProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [panel, setPanel] = useState(PANEL.home);

  useEffect(() => {
    setFullName(profile?.full_name || user?.user_metadata?.full_name || "");
    setPhone(profile?.phone || driver?.phone || user?.user_metadata?.phone || "");
  }, [profile, driver, user]);

  const email = user?.email || "";
  const typeLabel = accountLabel(accountType);
  const displayName = fullName || "الملف الشخصي";
  const initial = displayName.trim().charAt(0);
  const rating = Number(driver?.rating || 5).toFixed(1);
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || "";

  const quickActions = useMemo(
    () => [
      {
        id: "wallet",
        label: "المحفظة",
        icon: WalletIcon,
        onClick: () => (accountType === "rider" ? navigate("/wallet") : setPanel(PANEL.walletHint)),
      },
      { id: "help", label: "المساعدة", icon: HelpIcon, onClick: () => setPanel(PANEL.help) },
      { id: "inbox", label: "صندوق الوارد", icon: InboxIcon, onClick: () => setPanel(PANEL.inbox) },
      { id: "safety", label: "السلامة", icon: SafetyIcon, onClick: () => setPanel(PANEL.safety) },
    ],
    [accountType, navigate]
  );

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

      <div className="relative z-10 flex-1 min-h-full flex flex-col px-5 pt-5 pb-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => (panel === PANEL.home ? navigate(accountHomePath(accountType)) : setPanel(PANEL.home))}
            className="h-10 px-4 rounded-full backdrop-blur-md bg-slate-900/60 border border-white/10 text-[13px] font-bold"
          >
            {panel === PANEL.home ? "رجوع" : "القائمة"}
          </button>
          <span className="text-[12px] font-bold text-emerald-300/80">{typeLabel}</span>
        </div>

        <div className="mt-4 rounded-3xl backdrop-blur-md bg-slate-900/70 border border-white/10 p-5 flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center text-2xl font-extrabold text-emerald-300 shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-black leading-7 truncate">{displayName}</h1>
            <p className="mt-0.5 text-[12px] text-white/50 truncate" dir="ltr">
              {email || "بدون بريد"}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-300/20 px-2.5 h-7">
              <svg width="13" height="13" viewBox="0 0 24 24">
                <path
                  d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7-5.4-4.7 7.1-.6L12 2z"
                  fill="#fbbf24"
                />
              </svg>
              <span className="text-[13px] font-black text-amber-200">{rating}</span>
              <span className="text-[11px] text-white/45">تقييم</span>
            </div>
          </div>
        </div>

        {panel === PANEL.home ? (
          <>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {quickActions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="rounded-2xl backdrop-blur-md bg-slate-900/70 border border-white/10 py-3 px-1 flex flex-col items-center gap-2 active:bg-white/5"
                >
                  <span className="w-10 h-10 rounded-xl bg-emerald-400/15 border border-emerald-300/15 flex items-center justify-center">
                    <item.icon size={18} color="#6ee7b7" />
                  </span>
                  <span className="text-[11px] font-bold text-white/80 leading-4 text-center">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-3xl backdrop-blur-md bg-slate-900/70 border border-white/10 overflow-hidden">
              <ListRow
                icon={PromoIcon}
                label="العروض الترويجية"
                hint="أكواد وخصومات"
                onClick={() => setPanel(PANEL.promos)}
              />
              <ListRow
                icon={SettingsIcon}
                label="الإعدادات"
                hint="الاسم ورقم الهاتف"
                onClick={() => setPanel(PANEL.settings)}
              />
              <ListRow
                icon={UserIcon}
                label="إدارة الحساب"
                hint={typeLabel}
                onClick={() => setPanel(PANEL.account)}
                last
              />
            </div>

            <div className="mt-3 rounded-3xl backdrop-blur-md bg-slate-900/70 border border-white/10 overflow-hidden">
              <ListRow
                icon={LogoutIcon}
                label="تسجيل الخروج"
                hint="إنهاء الجلسة الحالية"
                danger
                last
                onClick={handleSignOut}
              />
            </div>
          </>
        ) : null}

        {panel === PANEL.settings || panel === PANEL.account ? (
          <form
            onSubmit={handleSave}
            className="mt-4 rounded-3xl backdrop-blur-md bg-slate-900/70 border border-white/10 p-5 space-y-4"
          >
            <p className="font-extrabold text-[16px]">
              {panel === PANEL.account ? "إدارة الحساب" : "الإعدادات"}
            </p>
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
        ) : null}

        {panel === PANEL.help ? (
          <InfoCard title="المساعدة">
            <p>للاستفسار عن رحلة أو مشكلة في الحساب راسل الدعم من خلال صندوق الوارد أو عبر البريد.</p>
            <p className="mt-2 text-white/50" dir="ltr">
              support@sahildrive.app
            </p>
          </InfoCard>
        ) : null}

        {panel === PANEL.inbox ? (
          <InfoCard title="صندوق الوارد">
            <p>لا توجد رسائل جديدة حالياً. ستظهر هنا تنبيهات الرحلات والعروض.</p>
          </InfoCard>
        ) : null}

        {panel === PANEL.safety ? (
          <InfoCard title="السلامة">
            <p>شارك تفاصيل الرحلة مع شخص تثق به، وتواصل مع الدعم فور حدوث أي طارئ.</p>
            <a
              href="tel:122"
              className="mt-4 h-12 rounded-xl bg-red-500/15 border border-red-400/30 text-red-200 font-bold flex items-center justify-center"
            >
              اتصال طوارئ 122
            </a>
          </InfoCard>
        ) : null}

        {panel === PANEL.promos ? (
          <InfoCard title="العروض الترويجية">
            <p>لا توجد أكواد نشطة الآن. أضف كود الخصم من شاشة تأكيد الرحلة عند توفره.</p>
          </InfoCard>
        ) : null}

        {panel === PANEL.walletHint ? (
          <InfoCard title="المحفظة">
            <p>محفظة الرصيد متاحة لحساب الراكب. حسابك الحالي: {typeLabel}.</p>
          </InfoCard>
        ) : null}
      </div>
    </div>
  );
}

function ListRow({ icon: Icon, label, hint, onClick, last, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-right ${
        last ? "" : "border-b border-white/8"
      } ${danger ? "text-red-300" : "text-white"}`}
    >
      <span
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          danger ? "bg-red-500/15 border border-red-400/20" : "bg-white/8 border border-white/10"
        }`}
      >
        <Icon size={17} color={danger ? "#fca5a5" : "#e2e8f0"} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-[14px]">{label}</span>
        {hint ? <span className="block text-[11px] text-white/40 mt-0.5">{hint}</span> : null}
      </span>
      <ChevronIcon />
    </button>
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

function InfoCard({ title, children }) {
  return (
    <div className="mt-4 rounded-3xl backdrop-blur-md bg-slate-900/70 border border-white/10 p-5">
      <p className="font-extrabold text-[16px] mb-2">{title}</p>
      <div className="text-[13px] leading-6 text-white/70">{children}</div>
    </div>
  );
}
