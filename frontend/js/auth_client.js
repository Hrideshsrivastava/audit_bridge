/* frontend/js/auth_client.js */
import { apiFetch } from "./api.js";

const showError = (msg) => {
  const el = document.getElementById("errorMessage");
  if (el) {
    el.innerText = msg;
    el.style.display = "block";
  } else {
    alert(msg);
  }
};

/* ============================
   1. RETURNING USER LOGIN
   (Email + Password)
   ============================ */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("loginBtn");
    const originalText = btn.innerText;
    
    // UI Loading State
    btn.disabled = true;
    btn.innerText = "Verifying...";
    
    try {
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      const res = await apiFetch("/auth/client/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      // Success: Save token & redirect
      localStorage.setItem("token", res.token);
      window.location.href = "client_dashboard.html";

    } catch (err) {
      showError(err.message || "Login failed");
      btn.disabled = false;
      btn.innerText = originalText;
    }
  };
}

/* ============================
   2. FIRST TIME ACTIVATION
   (Access Key -> Set Password)
   ============================ */
const activateForm = document.getElementById("activateForm");

if (activateForm) {
  activateForm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("activateBtn");
    const originalText = btn.innerText;

    // UI Loading State
    btn.disabled = true;
    btn.innerText = "Activating...";

    try {
      const access_key = document.getElementById("accessKey").value.trim();
      const password = document.getElementById("newPassword").value.trim();

      const res = await apiFetch("/auth/client/activate", {
        method: "POST",
        body: JSON.stringify({ access_key, password })
      });

      // Success: Save token
      localStorage.setItem("token", res.token);
      
      // IMPORTANT: Tell the user their Login ID (Email)
      alert(`Success! Your account is active.\n\nYour Login ID is: ${res.email}\nPlease use this email to log in next time.`);
      
      window.location.href = "client_dashboard.html";

    } catch (err) {
      showError(err.message || "Activation failed");
      btn.disabled = false;
      btn.innerText = originalText;
    }
  };
}