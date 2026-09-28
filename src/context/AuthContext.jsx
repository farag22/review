import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { isAdminUser } from "../lib/admin";
import { accountHomePath } from "../lib/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [driver, setDriver] = useState(null);
  const [accountType, setAccountType] = useState("guest");
  const [loading, setLoading] = useState(true);

  async function hydrateAccount(nextSession) {
    const user = nextSession?.user || null;
    if (!user?.id) {
      setProfile(null);
      setDriver(null);
      setAccountType("guest");
      return "guest";
    }

    const [{ data: profileRow }, { data: driverRow }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, role, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("drivers").select("id, user_id, full_name, phone, car_model, plate_number, ride_type").eq("user_id", user.id).maybeSingle(),
    ]);

    const nextProfile = profileRow || {
      id: user.id,
      full_name: user.user_metadata?.full_name || "",
      phone: user.user_metadata?.phone || "",
      role: user.user_metadata?.role || "rider",
    };
    setProfile(nextProfile);
    setDriver(driverRow || null);

    let type = "rider";
    if (isAdminUser(user, nextProfile?.role)) type = "admin";
    else if (driverRow || nextProfile?.role === "captain" || user.user_metadata?.role === "captain") type = "captain";
    setAccountType(type);
    return type;
  }

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      await hydrateAccount(data.session);
      if (!cancelled) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setTimeout(async () => {
        if (cancelled) return;
        await hydrateAccount(newSession);
        if (!cancelled) setLoading(false);
      }, 0);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
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
        role: "rider",
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
        role: "captain",
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
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setDriver(null);
    setAccountType("guest");
  }

  async function updateProfile({ fullName, phone }) {
    const user = session?.user;
    if (!user?.id) throw new Error("سجّل الدخول أولاً");
    const nextPhone = normalizePhone(phone) || String(phone || "").trim() || null;
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        phone: nextPhone,
        role: profile?.role || (accountType === "captain" ? "captain" : accountType === "admin" ? "admin" : "rider"),
      })
      .select("id, full_name, phone, role, avatar_url")
      .single();
    if (error) throw error;
    await supabase.auth.updateUser({
      data: { full_name: fullName, phone: nextPhone },
    });
    if (driver?.id) {
      await supabase
        .from("drivers")
        .update({ full_name: fullName, phone: nextPhone })
        .eq("id", driver.id);
      setDriver((prev) => (prev ? { ...prev, full_name: fullName, phone: nextPhone } : prev));
    }
    setProfile(data);
    return data;
  }

  async function refreshAccount(nextSession = session) {
    if (nextSession) setSession(nextSession);
    return hydrateAccount(nextSession);
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
    profile,
    driver,
    accountType,
    homePath: accountHomePath(accountType),
    loading,
    signInWithEmail,
    signUpWithEmail,
    signUpCaptain,
    signInWithOAuth,
    sendResetCode,
    verifyResetCode,
    updatePassword,
    updateProfile,
    refreshAccount,
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
