/* frontend/js/api.js */

// Base URL for your backend
let API_BASE = "http://localhost:3000"; // Fallback default

export async function determineApiBase() {
  const NGROK_URL = "https://gaye-atrabilious-kandra.ngrok-free.dev";
  const LOCAL_URL = "http://localhost:3000";

  try {
    // Ping the root or a safe health-check endpoint
    API_BASE = await Promise.any([
      fetch(`${LOCAL_URL}/ping`, { method: "HEAD" }).then(() => LOCAL_URL),
      fetch(`${NGROK_URL}/ping`, { method: "HEAD" }).then(() => NGROK_URL)
    ]);
  } catch (error) {
    console.warn("Both local and ngrok servers seem to be down.");
  }
  return API_BASE;
}

export async function apiFetch(endpoint, options = {}) {
  // 1. Get the token
  const token = localStorage.getItem("token"); 

  // 2. Prepare Headers
  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...options.headers,
  };

  // 3. Attach Token if it exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 4. Make the Request
  const config = {
    ...options,
    headers: headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  // 5. Handle Errors
  if (!response.ok) {
    if (response.status === 401) {
      console.warn("Unauthorized! Token might be invalid.");
      localStorage.removeItem("token");
      window.location.href = "index.html";
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`);
  }

  // 6. Return JSON
  return response.json();
}
