/* frontend/js/firm_clients.js */
import { apiFetch } from "./api.js";
import { requireFirmAuth, logout } from "./auth_guard.js";

// 1. Security Check
requireFirmAuth();
window.logout = logout; // Make logout available to HTML

// 2. Get Client ID from URL
const clientId = new URLSearchParams(location.search).get("clientId");
if (!clientId) {
  alert("No client specified");
  window.location.href = "firm_dashboard.html";
}

// 3. Main Logic
async function loadClientData() {
  try {
    const data = await apiFetch(`/firm/client/${clientId}`);

    // Update Header Info
    document.getElementById("clientName").innerText = data.clientName;
    document.getElementById("clientInfo").innerText = 
      `${data.auditType} | ${data.financialYear} | ${data.email}`;

    // Render Documents List (Matching your CSS Grid Layout)
    const container = document.getElementById("docsList"); // Correct ID
    container.innerHTML = "";

    if (!data.documents || data.documents.length === 0) {
      container.innerHTML = `<div style="padding:2rem; text-align:center;">No documents found.</div>`;
      return;
    }

    data.documents.forEach(d => {
      const row = document.createElement("div");
      row.className = "list-row"; // Correct CSS class
      row.style.gridTemplateColumns = "2fr 2fr 1fr 2fr"; // Match header grid

      // Logic for Status Colors
      let pillClass = "status-pending";
      if (d.status === "submitted") pillClass = "status-uploaded";
      if (d.status === "verified") pillClass = "status-verified";
      if (d.status === "rejected") pillClass = "status-pending";

      // Logic for File Link
      const fileLink = d.fileUrl 
        ? `<a href="${d.fileUrl}" target="_blank" style="color:#2563eb;font-weight:600;">View</a>` 
        : "-";

      // Logic for Action Buttons
      let actions = "-";
      if (d.status === "submitted") {
        actions = `
          <div style="display:flex; gap:0.5rem; justify-content:center;">
             <button onclick="window.verify('${d.documentId}')" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Verify</button>
             <button onclick="window.reject('${d.documentId}')" style="background:#dc2626; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Reject</button>
          </div>
        `;
      }

      row.innerHTML = `
        <div class="doc-name">${d.name}</div>
        <div><span class="status-pill ${pillClass}">${d.status}</span></div>
        <div style="text-align:center;">${fileLink}</div>
        <div style="text-align:center;">${actions}</div>
      `;
      container.appendChild(row);
    });

  } catch (err) {
    console.error(err);
    alert("Error loading client: " + err.message);
  }
}

// 4. Attach Global Functions for Buttons
window.verify = async (id) => {
  if(!confirm("Mark as Verified?")) return;
  await apiFetch(`/firm/document/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "verified" })
  });
  loadClientData();
};

window.reject = async (id) => {
  const reason = prompt("Enter rejection reason:");
  if (!reason) return;
  
  await apiFetch(`/firm/document/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "rejected", rejectionReason: reason })
  });
  loadClientData();
};

// Start
loadClientData();