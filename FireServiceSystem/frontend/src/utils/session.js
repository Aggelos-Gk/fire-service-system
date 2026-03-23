export function normalizeRole(role) {
  const normalized = (role || "").trim().toUpperCase();
  if (normalized.startsWith("ROLE_")) {
    return normalized.slice(5);
  }
  return normalized;
}

export function getStoredSession() {
  const userIdRaw = localStorage.getItem("userId");
  const userId = userIdRaw ? Number(userIdRaw) : null;

  return {
    userId: Number.isFinite(userId) ? userId : null,
    username: localStorage.getItem("username") || "",
    displayName: localStorage.getItem("displayName") || localStorage.getItem("username") || "",
    role: normalizeRole(localStorage.getItem("role")) || "GUEST",
    token: localStorage.getItem("token") || ""
  };
}

export function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("displayName");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
}

export function isAdmin(role) {
  return normalizeRole(role) === "ADMIN";
}

export function isLoggedIn(session) {
  return Boolean(session && session.userId && session.token);
}
