// /* frontend/js/auth_guard.js */

// export function requireAuth() {
//   const token = localStorage.getItem("token");
//   if (!token) {
//     window.location.href = "index.html";
//     throw new Error("Redirecting to login...");
//   }
// }

// export function requireFirmAuth() {
//   const token = localStorage.getItem("token");
//   if (!token) {
//     window.location.href = "firm_auth.html";
//     throw new Error("Redirecting to firm auth...");
//   }
// }

// export function logout() {
//   localStorage.removeItem("token");
//   window.location.href = "index.html";
// }


/* frontend/js/auth_client.js */
import { apiFetch } from "./api.js";

const form = document.getElementById("clientLoginForm");

if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault(); // STOP page reload

    const keyInput = document.getElementById("key");
    const access_key = keyInput.value.trim();
    const btn = document.getElementById("loginBtn");
    
    // UI Feedback
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Verifying...";

    try {
      const res = await apiFetch("/auth/client/activate", {
        method: "POST",
        body: JSON.stringify({
          access_key,
          password: "client123" // Default password logic
        })
      });

      localStorage.setItem("token", res.token);
      window.location.href = "client_dashboard.html";
    } catch (err) {
      alert("Login Failed: " + (err.message || "Invalid Key"));
      btn.disabled = false;
      btn.innerText = originalText;
    }
  };
}