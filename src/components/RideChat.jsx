import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function RideChat({
  rideId,
  senderRole = "rider",
  otherLabel = "الطرف الآخر",
  isOpen = true,
  onIncomingMessage,
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const isOpenRef = useRef(isOpen);
  const incomingRef = useRef(onIncomingMessage);

  useEffect(() => {
    isOpenRef.current = isOpen;
    incomingRef.current = onIncomingMessage;
  }, [isOpen, onIncomingMessage]);

  useEffect(() => {
    if (!rideId || !user?.id) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");
    seenIdsRef.current = new Set();

    async function syncMessages(initial = false) {
      const { data, error: loadError } = await supabase
        .from("ride_messages")
        .select("id, ride_id, sender_id, sender_role, body, created_at")
        .eq("ride_id", rideId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (!active) return;
      if (loadError) {
        if (initial) setError("تعذر تحميل المحادثة");
        return;
      }
      const newIncoming = (data || []).filter(
        (message) => !seenIdsRef.current.has(message.id) && message.sender_id !== user.id
      );
      data?.forEach((message) => seenIdsRef.current.add(message.id));
      setMessages(data || []);
      if (!initial && !isOpenRef.current) {
        newIncoming.forEach((message) => incomingRef.current?.(message));
      }
      setLoading(false);
    }

    syncMessages(true);
    const poll = window.setInterval(() => syncMessages(false), 2500);

    const channel = supabase
      .channel(`ride-messages-${rideId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_messages", filter: `ride_id=eq.${rideId}` },
        ({ new: message }) => {
          if (!active || !message) return;
          const alreadySeen = seenIdsRef.current.has(message.id);
          seenIdsRef.current.add(message.id);
          setMessages((current) =>
            current.some((item) => item.id === message.id) ? current : [...current, message]
          );
          if (!alreadySeen && message.sender_id !== user.id && !isOpenRef.current) {
            incomingRef.current?.(message);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [rideId, user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !rideId || !user?.id || sending) return;
    setSending(true);
    setError("");
    const { data, error: sendError } = await supabase
      .from("ride_messages")
      .insert({ ride_id: rideId, sender_id: user.id, sender_role: senderRole, body })
      .select("id, ride_id, sender_id, sender_role, body, created_at")
      .single();
    setSending(false);
    if (sendError) {
      setError("تعذر إرسال الرسالة");
      return;
    }
    if (data) {
      seenIdsRef.current.add(data.id);
      setMessages((current) => (current.some((item) => item.id === data.id) ? current : [...current, data]));
    }
    setDraft("");
  }

  if (!isOpen) return null;
  if (!rideId) return <p className="text-[12px] text-ink/50 mt-2">تظهر المحادثة بعد بدء الرحلة.</p>;

  return (
    <div className="mt-3 border-t border-black/5 pt-3">
      <p className="font-bold text-[13px]">محادثة الرحلة</p>
      <div className="mt-2 max-h-44 overflow-y-auto space-y-2 rounded-xl bg-sand/60 p-2">
        {loading && <p className="text-[12px] text-ink/45 text-center py-3">جاري تحميل الرسائل...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-[12px] text-ink/45 text-center py-3">ابدأ المحادثة مع {otherLabel}</p>
        )}
        {messages.map((message) => {
          const mine = message.sender_id === user?.id;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-[12px] ${mine ? "bg-brand-600 text-white rounded-br-md" : "bg-white text-ink rounded-bl-md"}`}>
                {message.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
      <form onSubmit={sendMessage} className="flex gap-2 mt-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={500}
          placeholder="اكتب رسالة..."
          className="min-w-0 flex-1 h-10 rounded-xl border border-black/10 px-3 text-[12px] bg-white"
          aria-label="نص الرسالة"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="h-10 px-3 rounded-xl bg-brand-600 text-white text-[12px] font-bold disabled:opacity-40"
        >
          {sending ? "..." : "إرسال"}
        </button>
      </form>
    </div>
  );
}
