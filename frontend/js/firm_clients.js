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

    document.getElementById("clientName").innerText = data.clientName;
    document.getElementById("clientInfo").innerText = `${data.auditType} | ${data.financialYear}`;

    const container = document.getElementById("docsList");
    container.innerHTML = "";

    if (!data.documents || data.documents.length === 0) {
      container.innerHTML = `<div style="padding:2rem; text-align:center;">No documents found.</div>`;
      return;
    }

    data.documents.forEach(d => {
      const row = document.createElement("div");
      row.className = "list-row";
      // Match the new HTML grid columns
      row.style.gridTemplateColumns = "2fr 1.5fr 1fr 2.5fr"; 

      // Status Badge Logic
      let pillClass = "status-pending";
      if (d.status === "submitted") pillClass = "status-uploaded";
      if (d.status === "verified") pillClass = "status-verified";
      if (d.status === "rejected") pillClass = "status-pending";

      // File Link Logic
      const fileLink = d.fileUrl 
        ? `<a href="${d.fileUrl}" target="_blank" style="color:#2563eb;font-weight:600;">View PDF</a>` 
        : "-";

      // ✅ NEW: Date Picker with Auto-Save
      // We format the date to YYYY-MM-DD for the input value
      const dateValue = d.dueDate ? d.dueDate.split('T')[0] : '';
      
      const dateInput = `
        <input type="date" 
               value="${dateValue}" 
               onchange="updateDueDate('${d.documentId}', this.value)"
               style="padding:5px; border:1px solid #cbd5e1; border-radius:4px; color:#475569; font-family:inherit;">
      `;

      // Action Buttons
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
        <div>${dateInput}</div>
        <div style="text-align:center;">${fileLink}</div>
        <div style="text-align:center;">${actions}</div>
      `;
      container.appendChild(row);
    });

  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
}

// ✅ NEW: Global function to handle Date Changes
window.updateDueDate = async (docId, newDate) => {
  if(!newDate) return;
  
  try {
    // Visual feedback (optional)
    // console.log("Saving date...", newDate);
    
    await apiFetch(`/firm/document/${docId}/due-date`, {
      method: "PATCH",
      body: JSON.stringify({ due_date: newDate })
    });
    
    // Optional: Show a tiny "Saved" toast or notification
  } catch (err) {
    alert("Failed to update date: " + err.message);
  }
};

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