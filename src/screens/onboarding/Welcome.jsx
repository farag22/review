import React from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="relative flex-1 min-h-full overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#064e3b_0%,_transparent_52%),radial-gradient(ellipse_at_bottom,_#0f172a_0%,_#020617_70%)]" />
      <div className="absolute -top-16 -left-10 w-56 h-56 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute bottom-24 -right-16 w-64 h-64 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative z-10 flex-1 min-h-full flex flex-col px-5 pt-10 pb-6">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-[88%] max-w-[320px] rounded-3xl backdrop-blur-md bg-slate-900/60 border border-white/10 px-6 py-8 flex flex-col items-center text-center shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)]">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center mb-5">
              <CarIllustration />
            </div>
            <p className="text-[11px] tracking-[0.28em] text-emerald-300/80 font-bold">SAHIL DRIVE</p>
            <h1 className="mt-2 text-[28px] leading-tight font-extrabold">
              Sahil <span className="text-emerald-400">Drive</span>
            </h1>
            <p className="mt-3 text-[14px] leading-7 text-white/70">
              رحلتك آمنة وسريعة في القليوبية، أينما تذهب
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl backdrop-blur-md bg-slate-900/60 border border-white/10 p-5 space-y-3">
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[15px] transition-colors"
          >
            إنشاء حساب جديد
          </button>
          <button
            type="button"
            onClick={() => navigate("/signin")}
            className="w-full h-14 rounded-2xl border border-emerald-500 text-emerald-400 bg-transparent hover:bg-emerald-500/10 font-bold text-[15px] transition-colors"
          >
            تسجيل الدخول
          </button>

          <div className="pt-2 flex items-center justify-center gap-4 text-[13px]">
            <button
              type="button"
              onClick={() => navigate("/captain/signin")}
              className="text-white/80 font-bold hover:text-emerald-300 transition-colors"
            >
              دخول الكابتن
            </button>
            <span className="w-1 h-1 rounded-full bg-white/25" />
            <button
              type="button"
              onClick={() => navigate("/admin/signin")}
              className="text-white/70 font-semibold hover:text-emerald-300 transition-colors"
            >
              لوحة الإدارة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CarIllustration() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path
        d="M7 21c0-2.2 1.4-3.6 3.4-4.2l3.2-4.2A5 5 0 0 1 17.6 11h5.2c1.6 0 3 .8 3.9 2.1l2.1 3.2c1.8.4 3.4 1.8 3.6 3.8"
        stroke="#34d399"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="7" y="20" width="21" height="4.2" rx="1.4" stroke="#34d399" strokeWidth="2" />
      <circle cx="12" cy="25.5" r="2.1" fill="#34d399" />
      <circle cx="23.5" cy="25.5" r="2.1" fill="#34d399" />
    </svg>
  );
}
