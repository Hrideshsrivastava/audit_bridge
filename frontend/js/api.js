/* frontend/js/api.js */

// Base URL for your backend
export const API_BASE = "https://audit-bridge-1.onrender.com"; 

export async function apiFetch(endpoint, options = {}) {
  // 1. Get the token
  const token = localStorage.getItem("token"); 

  // 2. Prepare Headers
  const headers = {
    "Content-Type": "application/json",
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