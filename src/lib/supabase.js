import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://example.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "public-anon-placeholder";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase env vars are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local"
  );
}

export const AUTH_STORAGE_KEY = "sahil-drive-auth";

function createAuthStorage() {
  const memory = new Map();
  const canUseLocalStorage = () => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      const probe = "__sahil_auth_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  };
  const persistent = canUseLocalStorage() ? window.localStorage : null;

  return {
    getItem(key) {
      try {
        const value = persistent?.getItem(key);
        if (value != null) {
          memory.set(key, value);
          return value;
        }
      } catch {
        /* ignore quota / private mode */
      }
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      memory.set(key, value);
      try {
        persistent?.setItem(key, value);
      } catch {
        /* ignore quota / private mode */
      }
    },
    removeItem(key) {
      memory.delete(key);
      try {
        persistent?.removeItem(key);
      } catch {
        /* ignore quota / private mode */
      }
    },
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: createAuthStorage(),
    storageKey: AUTH_STORAGE_KEY,
  },
});
