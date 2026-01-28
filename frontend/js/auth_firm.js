import { apiFetch } from "./api.js";

// Pass 'e' (event) here
document.getElementById("firmLogin").onclick = async (e) => {
  e.preventDefault(); // STOP the page reload

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  try {
    const res = await apiFetch("/auth/firm/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    localStorage.setItem("token", res.token);
    window.location.href = "firm_dashboard.html";
  } catch (err) {
    console.error("Login failed:", err);
  }
};

// Pass 'e' here too
document.getElementById("firmRegister").onclick = async (e) => {
  e.preventDefault(); // STOP the page reload

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  try {
    await apiFetch("/auth/firm/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New CA Firm",
        email,
        password
      })
    });

    // optional auto-login after signup
    const login = await apiFetch("/auth/firm/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    localStorage.setItem("token", login.token);
    window.location.href = "firm_dashboard.html";
  } catch (err) {
    console.error("Registration failed:", err);
  }
};