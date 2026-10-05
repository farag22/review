import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { isAdminUser } from "../lib/admin";
import { accountHomePath, clearAuthStorage } from "../lib/session";

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

    const metaRole = String(user.user_metadata?.role || "").toLowerCase();
    let profileRow = null;
    let driverRow = null;
    let profileError = null;
    let driverError = null;
    try {
      const [{ data: nextProfileRow, error: nextProfileError }, { data: nextDriverRow, error: nextDriverError }] =
        await Promise.all([
          supabase.from("profiles").select("id, full_name, phone, role, avatar_url").eq("id", user.id).maybeSingle(),
          supabase.from("drivers").select("id, user_id, full_name, phone, car_model, plate_number, ride_type").eq("user_id", user.id).maybeSingle(),
        ]);
      profileRow = nextProfileRow;
      driverRow = nextDriverRow;
      profileError = nextProfileError;
      driverError = nextDriverError;
    } catch {
      profileRow = null;
      driverRow = null;
    }

    const authGone = [profileError?.message, driverError?.message].some((msg) =>
      /jwt|session|not authenticated|invalid/i.test(String(msg || ""))
    );
    if (authGone) {
      await signOut();
      return "guest";
    }

    const nextProfile = profileRow || {
      id: user.id,
      full_name: user.user_metadata?.full_name || "",
      phone: user.user_metadata?.phone || "",
      role: metaRole || "rider",
    };
    if (!profileRow && !driverRow && metaRole !== "captain" && metaRole !== "admin") {
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
        phone: user.user_metadata?.phone || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        role: "rider",
      });
    }
    setProfile(nextProfile);
    setDriver(driverRow || null);

    let type = "rider";
    if (isAdminUser(user, nextProfile?.role) || metaRole === "admin") type = "admin";
    else if (driverRow || nextProfile?.role === "captain" || metaRole === "captain") type = "captain";
    setAccountType(type);
    return type;
  }

  useEffect(() => {
    let cancelled = false;
    let bootstrapped = false;
    let lastToken = null;

    async function applySession(nextSession, { finishLoading } = {}) {
      if (cancelled) return;
      const token = nextSession?.access_token || null;
      const sameUser = token === lastToken && Boolean(token) === Boolean(nextSession?.user);
      lastToken = token;
      setSession(nextSession || null);
      if (!sameUser) {
        try {
          await hydrateAccount(nextSession);
        } catch {
          if (!nextSession?.user) {
            setProfile(null);
            setDriver(null);
            setAccountType("guest");
          }
        }
      }
      if (finishLoading && !cancelled) setLoading(false);
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        bootstrapped = true;
        await applySession(data?.session || null, { finishLoading: true });
      })
      .catch(async () => {
        bootstrapped = true;
        await applySession(null, { finishLoading: true });
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "INITIAL_SESSION") return;
      setTimeout(() => {
        applySession(newSession, { finishLoading: bootstrapped });
      }, 0);
    });

    function restoreIfVisible() {
      if (document.visibilityState !== "visible") return;
      supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        applySession(data?.session || null, { finishLoading: true });
      });
    }
    window.addEventListener("focus", restoreIfVisible);
    document.addEventListener("visibilitychange", restoreIfVisible);

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
      window.removeEventListener("focus", restoreIfVisible);
      document.removeEventListener("visibilitychange", restoreIfVisible);
    };
  }, []);

  async function signInWithEmail(email, password) {
    const identity = resolveLoginIdentity(email);
    if (!identity.email) {
      return { data: { user: null, session: null }, error: { message: "أدخل بريدًا إلكترونيًا أو رقم هاتف صحيح" } };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identity.email,
      password,
    });
    return { data, error: error ? { ...error, message: authErrorMessage(error) } : null };
  }

  async function signInWithGoogle(redirectPath = "/signin") {
    const redirectTo = `${window.location.origin}${redirectPath}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    return { data, error: error ? { ...error, message: authErrorMessage(error) } : null };
  }

  async function signUpWithEmail({ fullName, email, phone, password }) {
    const identity = resolveEmailAndPhone(email, phone);
    if (!identity.email) {
      return { data: { user: null, session: null }, error: { message: "أدخل بريدًا إلكترونيًا صحيحًا أو رقم هاتف" } };
    }
    const { data, error } = await supabase.auth.signUp({
      email: identity.email,
      password,
      options: { data: { full_name: fullName, phone: identity.phone, role: "rider" } },
    });
    if (!error && data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        phone: identity.phone,
        role: "rider",
      });
    }
    return { data, error: error ? { ...error, message: authErrorMessage(error) } : null };
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
    return { data, error: error ? { ...error, message: authErrorMessage(error) } : null };
  }

  async function sendResetCode(email) {
    const identity = resolveLoginIdentity(email);
    if (!identity.email) {
      return { data: null, error: { message: "أدخل بريدًا إلكترونيًا أو رقم هاتف صحيح" } };
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(identity.email, {
      redirectTo: `${window.location.origin}/create-new-password`,
    });
    return { data, error: error ? { ...error, message: authErrorMessage(error) } : null };
  }

  async function verifyResetCode(email, code) {
    const identity = resolveLoginIdentity(email);
    if (!identity.email) {
      return { data: null, error: { message: "أدخل بريدًا إلكترونيًا أو رقم هاتف صحيح" } };
    }
    const { data, error } = await supabase.auth.verifyOtp({
      email: identity.email,
      token: code,
      type: "recovery",
    });
    return { data, error: error ? { ...error, message: authErrorMessage(error) } : null };
  }

  async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error: error ? { ...error, message: authErrorMessage(error) } : null };
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }
    }
    clearAuthStorage();
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

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    driver,
    accountType,
    homePath: accountHomePath(accountType),
    loading,
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    signUpCaptain,
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

function phoneAuthEmail(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return "";
  return `${digits}@phone.sahil-drive.app`;
}

function resolveLoginIdentity(value) {
  const raw = String(value || "").trim();
  if (looksLikeEmail(raw)) return { email: normalizeEmail(raw), phone: null };
  const phone = normalizePhone(raw);
  if (phone) return { email: phoneAuthEmail(phone), phone };
  return { email: "", phone: null };
}

function authErrorMessage(error) {
  const text = String(error?.message || "").toLowerCase();
  if (text.includes("invalid login")) return "البريد الإلكتروني أو كلمة السر غير صحيحة";
  if (text.includes("email not confirmed")) return "أكد بريدك الإلكتروني ثم سجّل الدخول";
  if (text.includes("already registered") || text.includes("user already")) return "هذا الحساب مسجّل بالفعل، سجّل الدخول";
  if (text.includes("password")) return "كلمة السر غير صالحة";
  if (text.includes("rate limit") || text.includes("too many")) return "محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة";
  return error?.message || "تعذر إتمام العملية، حاول مرة أخرى";
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
  const phoneDigits = normalizePhone(rawPhone || rawEmail);
  if (phoneDigits) return { email: phoneAuthEmail(phoneDigits), phone: phoneDigits };
  return { email: "", phone: phoneDigits };
}
