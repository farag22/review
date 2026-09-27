import React from "react";

// هذا مكوّن بديل بسيط. في الإنتاج استبدله بـ Google Maps
// (react-google-maps/api) أو Mapbox GL باستخدام مفتاح API حقيقي
// ومواقع lat/lng فعلية من جدول rides في Supabase.
export default function MapView({ height = 220, children }) {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-[#dfeae3]"
      style={{ height }}
    >
      <svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="none">
        <rect width="400" height="220" fill="#e3eee7" />
        {[...Array(6)].map((_, i) => (
          <path
            key={"h" + i}
            d={`M0 ${20 + i * 35} H400`}
            stroke="#cfe0d6"
            strokeWidth="2"
          />
        ))}
        {[...Array(8)].map((_, i) => (
          <path
            key={"v" + i}
            d={`M${25 + i * 50} 0 V220`}
            stroke="#cfe0d6"
            strokeWidth="2"
          />
        ))}
        <path
          d="M20 180 C 100 120, 180 160, 260 90 S 380 40, 390 30"
          stroke="#0b7350"
          strokeWidth="4"
          fill="none"
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
      </svg>
      {children}
    </div>
  );
}
