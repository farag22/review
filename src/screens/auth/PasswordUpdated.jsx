import React from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../../components/ui";

export default function PasswordUpdated() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
      <div className="w-24 h-24 rounded-full bg-brand-50 flex items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#0b7350" />
          <path d="M7 12.5l3 3 7-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-xl font-extrabold">تم تحديث كلمة السر</h1>
      <p className="text-ink/55 text-[14px]">تم تحديث كلمة السر الخاصة بحسابك بنجاح</p>
      <div className="w-full pt-6">
        <PrimaryButton onClick={() => navigate("/signin")}>تسجيل الدخول</PrimaryButton>
      </div>
    </div>
  );
}
