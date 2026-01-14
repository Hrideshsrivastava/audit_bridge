import { apiFetch } from "./api.js";

document.getElementById("login").onclick = async () => {
  const access_key = key.value;

  const res = await apiFetch("/auth/client/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_key,
      password: "client123"
    })
  });

  localStorage.setItem("token", res.token);
  window.location.href = "client_dashboard.html";
};
