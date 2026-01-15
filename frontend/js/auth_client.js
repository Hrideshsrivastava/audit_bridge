/* frontend/js/auth_client.js */
import { apiFetch } from "./api.js";

// 1. Target the FORM, not the button
const form = document.getElementById("clientLoginForm");

// 2. Add Safety Check: Does the form exist?
if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault(); // STOP page reload

    // 3. Define the input explicitly (fixes 'key is not defined' error)
    const keyInput = document.getElementById("key");
    const access_key = keyInput.value.trim();
    
    // UI Elements
    const btn = document.getElementById("loginBtn");
    const loginText = document.getElementById("loginText");
    const spinner = document.getElementById("loginSpinner");
    const errorDiv = document.getElementById("errorMessage");

    if (!access_key) {
      errorDiv.textContent = "Please enter an Access Key";
      errorDiv.style.display = "block";
      return;
    }

    // Loading State
    btn.disabled = true;
    loginText.style.display = "none";
    spinner.style.display = "inline";
    errorDiv.style.display = "none";

    try {
      const res = await apiFetch("/auth/client/activate", {
        method: "POST",
        body: JSON.stringify({
          access_key,
          password: "client123" 
        })
      });

      localStorage.setItem("token", res.token);
      window.location.href = "client_dashboard.html";

    } catch (err) {
      console.error("Login Error:", err);
      errorDiv.textContent = err.message || "Invalid Access Key";
      errorDiv.style.display = "block";
      
      // Reset Button
      btn.disabled = false;
      loginText.style.display = "inline";
      spinner.style.display = "none";
    }
  };
} else {
  console.error("Error: Could not find form with id 'clientLoginForm'. Check your HTML.");
}