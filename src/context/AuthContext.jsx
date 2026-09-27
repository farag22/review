import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // تسجيل الدخول برقم الهاتف وكلمة السر (متخزنة كـ email مموّه في Supabase auth
  // أو استخدم supabase.auth.signInWithOtp لو عايز OTP فعلي عبر SMS provider)
  async function signInWithPhone(phone, password) {
    const email = phoneToPseudoEmail(phone);
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signUpWithPhone({ fullName, phone, password }) {
    const email = phoneToPseudoEmail(phone);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (!error && data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        phone,
      });
    }
    return { data, error };
  }

  async function sendResetCode(phone) {
    // فعليًا: استدعاء Edge Function بترسل SMS عن طريق مزود مصري (مثلاً Vodafone/Taqnyat)
    // وتخزين الكود في جدول otp_codes مع وقت انتهاء صلاحية
    return supabase.functions.invoke("send-otp", { body: { phone } });
  }

  async function verifyResetCode(phone, code) {
    return supabase.functions.invoke("verify-otp", { body: { phone, code } });
  }

  async function updatePassword(newPassword) {
    return supabase.auth.updateUser({ password: newPassword });
  }

  async function signOut() {
    return supabase.auth.signOut();
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signInWithPhone,
    signUpWithPhone,
    sendResetCode,
    verifyResetCode,
    updatePassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Supabase Auth بيحتاج email، فبنحول رقم الهاتف لصيغة شكلية بتفضل فريدة لكل مستخدم.
// (في نسخة إنتاج، الأفضل تستخدم Supabase Phone Auth مباشرة مع مزود SMS مربوط)
function phoneToPseudoEmail(phone) {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@rider.sahildrive.eg`;
}
