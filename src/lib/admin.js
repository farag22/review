import { supabase } from "./supabase";

export const ADMIN_EMAILS = ["farag20014@gmail.com"];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || "").trim().toLowerCase());
}

export function isAdminUser(user, profileRole) {
  if (profileRole === "admin" || user?.user_metadata?.role === "admin") return true;
  return isAdminEmail(user?.email);
}

export async function ensureAdminProfile(user) {
  if (!user?.id || !isAdminEmail(user.email)) return false;
  const row = {
    id: user.id,
    full_name: user.user_metadata?.full_name || "المدير",
    role: "admin",
  };
  await supabase.from("profiles").upsert(row);
  return true;
}
