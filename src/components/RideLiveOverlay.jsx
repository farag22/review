import React, { useState } from "react";
import { ChatIcon, PhoneCallIcon } from "./Icons";

export default function RideLiveOverlay({
  badge = "تتبع مباشر",
  phone,
  chatTitle,
  chatBody,
}) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <span className="sd-overlay-btn bg-white/95 shadow-card rounded-full px-3 h-9 flex items-center text-[12px] font-bold">
          {badge}
        </span>
        <div className="flex gap-2 pointer-events-auto">
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center shadow-card"
            >
              <PhoneCallIcon size={16} />
            </a>
          ) : (
            <button
              type="button"
              className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center shadow-card opacity-50"
              disabled
            >
              <PhoneCallIcon size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-card"
          >
            <ChatIcon size={16} />
          </button>
        </div>
      </div>
      {chatOpen && (
        <div className="absolute top-20 left-4 right-4 z-20 bg-white rounded-2xl shadow-card p-4">
          <p className="font-bold text-[13px]">{chatTitle}</p>
          <p className="text-[12px] text-ink/50 mt-1">{chatBody}</p>
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            className="mt-3 text-[12px] font-bold text-brand-700"
          >
            إغلاق
          </button>
        </div>
      )}
    </>
  );
}
