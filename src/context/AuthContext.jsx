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

  async function signInWithEmail(email, password) {
    const identity = resolveEmailAndPhone(email, "");
    if (!identity.email) {
      return { data: { user: null, session: null }, error: { message: "أدخل بريدًا إلكترونيًا صحيحًا" } };
    }
    return supabase.auth.signInWithPassword({
      email: identity.email,
      password,
    });
  }

  async function signUpWithEmail({ fullName, email, phone, password }) {
    const identity = resolveEmailAndPhone(email, phone);
    if (!identity.email) {
      return { data: { user: null, session: null }, error: { message: "أدخل بريدًا إلكترونيًا صحيحًا في خانة الإيميل" } };
    }
    const { data, error } = await supabase.auth.signUp({
      email: identity.email,
      password,
      options: { data: { full_name: fullName, phone: identity.phone } },
    });
    if (!error && data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        phone: identity.phone,
      });
    }
    return { data, error };
  }

  async function signUpCaptain({
    fullName,
    email,
    phone,
    password,
    carModel,
    plateNumber,
    rideType,
  }) {
    const identity = resolveEmailAndPhone(email, phone);
    if (!identity.email) {
      return { data: { user: null, session: null }, error: { message: "أدخل بريدًا إلكترونيًا صحيحًا في خانة الإيميل" } };
    }
    const meta = {
      full_name: fullName,
      phone: identity.phone,
      role: "captain",
      car_model: carModel || null,
      plate_number: plateNumber || null,
      ride_type: rideType || null,
    };
    const { data, error } = await supabase.auth.signUp({
      email: identity.email,
      password,
      options: { data: meta },
    });
    if (!error && data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        phone: identity.phone,
      });
      await supabase.from("drivers").upsert(
        {
          user_id: data.user.id,
          full_name: fullName,
          phone: identity.phone,
          car_model: carModel || null,
          plate_number: plateNumber || null,
          ride_type: rideType || null,
          is_online: false,
        },
        { onConflict: "user_id" }
      );
    }
    return { data, error };
  }

  async function sendResetCode(email) {
    return supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/create-new-password`,
    });
  }

  async function verifyResetCode(email, code) {
    return supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token: code,
      type: "recovery",
    });
  }

  async function updatePassword(newPassword) {
    return supabase.auth.updateUser({ password: newPassword });
  }

  async function signOut() {
    return supabase.auth.signOut();
  }

  async function signInWithOAuth(provider) {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/home` },
    });
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signUpCaptain,
    signInWithOAuth,
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function resolveEmailAndPhone(email, phone) {
  const rawEmail = String(email || "").trim();
  const rawPhone = String(phone || "").trim();
  if (looksLikeEmail(rawPhone) && (normalizePhone(rawEmail) || !looksLikeEmail(rawEmail))) {
    return {
      email: normalizeEmail(rawPhone),
      phone: normalizePhone(rawEmail),
    };
  }
  if (looksLikeEmail(rawEmail)) {
    return {
      email: normalizeEmail(rawEmail),
      phone: looksLikeEmail(rawPhone) ? null : normalizePhone(rawPhone),
    };
  }
  if (looksLikeEmail(rawPhone)) {
    return { email: normalizeEmail(rawPhone), phone: null };
  }
  return { email: "", phone: normalizePhone(rawPhone) };
}
