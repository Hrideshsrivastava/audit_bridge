/* frontend/js/auth_guard.js */

export function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    throw new Error("Redirecting to login...");
  }
}

export function requireFirmAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "firm_auth.html";
    throw new Error("Redirecting to firm auth...");
  }
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}