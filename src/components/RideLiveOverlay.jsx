import React, { useEffect, useState } from "react";
import { ChatIcon, PhoneCallIcon } from "./Icons";
import RideChat from "./RideChat";

export default function RideLiveOverlay({
  badge = "تتبع مباشر",
  phone,
  chatTitle,
  chatBody,
  rideId,
  senderRole,
  otherLabel,
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen]);

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
            className="relative w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-card"
            aria-label={unreadCount ? `رسائل جديدة: ${unreadCount}` : "فتح المحادثة"}
          >
            <ChatIcon size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <div className={`fixed inset-0 z-[60] bg-slate-950/35 p-4 pt-20 md:pt-24 flex items-start justify-center ${chatOpen ? "" : "hidden"}`}>
        <div className="w-full max-w-md max-h-[calc(100dvh-6rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl p-4">
          {rideId ? (
            <RideChat
              rideId={rideId}
              senderRole={senderRole}
              otherLabel={otherLabel}
              isOpen={chatOpen}
              onIncomingMessage={() => setUnreadCount((count) => count + 1)}
            />
          ) : (
            <>
              <p className="font-bold text-[13px]">{chatTitle}</p>
              <p className="text-[12px] text-ink/50 mt-1">{chatBody}</p>
            </>
          )}
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            className="mt-4 w-full h-10 rounded-xl bg-sand text-[12px] font-bold text-brand-700"
          >
            إغلاق
          </button>
        </div>
      </div>
    </>
  );
}
