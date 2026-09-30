export function clearAuthStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("sahil-drive-auth");
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("sb-") || key.includes("supabase") || key.startsWith("sahil-drive")) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.removeItem("sahil-drive-auth");
  } catch {
    /* ignore */
  }
}

export function accountHomePath(accountType) {
  if (accountType === "admin") return "/admin/dashboard";
  if (accountType === "captain") return "/captain/dashboard";
  return "/home";
}

export function accountProfilePath(accountType) {
  if (accountType === "admin") return "/admin/profile";
  if (accountType === "captain") return "/captain/profile";
  return "/profile";
}

export function accountLabel(accountType) {
  if (accountType === "admin") return "إدارة";
  if (accountType === "captain") return "كابتن";
  return "راكب";
}
