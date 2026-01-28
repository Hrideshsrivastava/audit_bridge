/* frontend/js/auth_guard.js */

export function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    throw new Error("Redirecting...");
  }
}

export function requireFirmAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "firm_auth.html";
    throw new Error("Redirecting...");
  }
}

// ✅ This export was missing!
export function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}