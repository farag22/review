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
