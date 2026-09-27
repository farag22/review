import React from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton, GhostButton, BrandMark } from "../../components/ui";

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-brand-700 to-brand-500 text-white">
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        <div className="w-64 h-40 rounded-2xl bg-white/10 flex items-center justify-center">
          <CarIllustration />
        </div>
        <div className="text-center">
          <BrandMark size="text-3xl" />
          <p className="mt-2 text-white/80 text-[14px]">
            رحلتك آمنة وسريعة في القليوبية، أينما تذهب
          </p>
        </div>
      </div>
      <div className="p-6 space-y-3">
        <PrimaryButton
          className="bg-white !text-brand-700"
          onClick={() => navigate("/signup")}
        >
          إنشاء حساب جديد
        </PrimaryButton>
        <GhostButton
          className="bg-transparent !text-white border-white/40"
          onClick={() => navigate("/signin")}
        >
          تسجيل الدخول
        </GhostButton>
      </div>
    </div>
  );
}

function CarIllustration() {
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" fill="none">
      <ellipse cx="80" cy="78" rx="60" ry="6" fill="rgba(0,0,0,0.15)" />
      <path
        d="M20 58c0-6 4-10 10-12l14-16c3-3 7-5 11-5h30c5 0 9 2 12 6l10 14c6 1 12 5 13 13"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="20" y="55" width="100" height="14" rx="4" stroke="white" strokeWidth="2.5" fill="none" />
      <circle cx="40" cy="70" r="8" fill="white" />
      <circle cx="100" cy="70" r="8" fill="white" />
    </svg>
  );
}
