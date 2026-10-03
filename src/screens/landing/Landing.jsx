import React from "react";
import { Link } from "react-router-dom";

const VODAFONE_CASH = "01003454288";
const CONTACT_PHONE = "01115413154";

export default function Landing() {
  return (
    <div className="landing-page min-h-screen bg-[#06140f] text-white" dir="rtl">
      <header className="sticky top-0 z-20 bg-[#06140f]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <p className="font-extrabold text-[18px]">
            Sahil <span className="text-emerald-400">Drive</span>
          </p>
          <nav className="flex items-center gap-2 text-[13px] font-bold">
            <Link to="/captain" className="h-9 px-3 rounded-full border border-white/15 hover:bg-white/10">
              دخول الكابتن
            </Link>
            <Link to="/admin" className="h-9 px-3 rounded-full border border-white/15 hover:bg-white/10">
              الإدارة
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10 md:py-16 space-y-10">
        <section className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-emerald-300 text-[12px] font-bold tracking-[0.2em]">نقل ذكي محلي</p>
            <h1 className="mt-3 text-[32px] md:text-[44px] leading-tight font-extrabold">
              رحلتك في سوهاج والقليوبية
              <span className="block text-emerald-400">آمنة وسريعة</span>
            </h1>
            <p className="mt-4 text-white/70 text-[15px] leading-8 max-w-xl">
              ساحل درايف خدمة نقل ذكي تربط الركاب بالكباتن القريبين لحجز سيارة أو توك توك أو سكوتر داخل سوهاج والقليوبية، مع تسعير واضح وتتبع مباشر.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#download"
                className="h-12 px-5 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold inline-flex items-center"
              >
                تحميل التطبيق
              </a>
              <Link
                to="/signup"
                className="h-12 px-5 rounded-2xl bg-white text-slate-950 font-extrabold inline-flex items-center"
              >
                تسجيل راكب
              </Link>
              <Link
                to="/signin"
                className="h-12 px-5 rounded-2xl border border-white/20 font-bold inline-flex items-center"
              >
                دخول الراكب
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 space-y-4">
            <p className="font-extrabold text-[18px]">خدمات النقل</p>
            <ul className="space-y-3 text-[14px] text-white/80">
              <li>سيارات اقتصادية وكومفورت داخل المدينة</li>
              <li>توك توك وسكوتر للمشاوير القصيرة</li>
              <li>تتبع الرحلة ودفع نقداً أو بالمحفظة</li>
            </ul>
            <div className="pt-2 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-[11px] text-white/50">التغطية</p>
                <p className="font-extrabold mt-1">سوهاج</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-[11px] text-white/50">والتوسع</p>
                <p className="font-extrabold mt-1">القليوبية</p>
              </div>
            </div>
          </div>
        </section>

        <section id="download" className="rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-6 md:p-8">
          <h2 className="text-[22px] font-extrabold">تحميل التطبيق</h2>
          <p className="mt-2 text-white/70 text-[14px] leading-7">
            افتح التطبيق من المتصفح الآن، أو احفظ الصفحة على الشاشة الرئيسية لاستخدامها كتطبيق.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/app" className="h-12 px-5 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold inline-flex items-center">
              فتح التطبيق
            </Link>
            <Link to="/signup" className="h-12 px-5 rounded-2xl bg-white text-slate-950 font-extrabold inline-flex items-center">
              إنشاء حساب راكب
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <Link to="/captain" className="rounded-[24px] border border-white/10 bg-white/5 p-6 hover:bg-white/10">
            <p className="text-emerald-300 text-[12px] font-bold">مسار مستقل</p>
            <h3 className="mt-2 text-[20px] font-extrabold">دخول الكباتن</h3>
            <p className="mt-2 text-white/65 text-[14px] leading-7">لوحة الكابتن منفصلة عن واجهة الركاب عبر /captain</p>
          </Link>
          <Link to="/admin" className="rounded-[24px] border border-white/10 bg-white/5 p-6 hover:bg-white/10">
            <p className="text-emerald-300 text-[12px] font-bold">مسار مستقل</p>
            <h3 className="mt-2 text-[20px] font-extrabold">لوحة الإدارة</h3>
            <p className="mt-2 text-white/65 text-[14px] leading-7">دخول الإدارة عبر /admin دون المرور بتطبيق الراكب</p>
          </Link>
        </section>

        <section className="rounded-[28px] bg-white text-ink p-6 md:p-8">
          <h2 className="text-[20px] font-extrabold">أرقام التواصل الرسمية</h2>
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <a href={`tel:${VODAFONE_CASH}`} className="rounded-2xl bg-sand p-4" dir="ltr">
              <p className="text-[12px] text-ink/50 text-right">فودافون كاش</p>
              <p className="mt-1 font-extrabold text-[22px]">{VODAFONE_CASH}</p>
            </a>
            <a href={`tel:${CONTACT_PHONE}`} className="rounded-2xl bg-sand p-4" dir="ltr">
              <p className="text-[12px] text-ink/50 text-right">التواصل المباشر</p>
              <p className="mt-1 font-extrabold text-[22px]">{CONTACT_PHONE}</p>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
