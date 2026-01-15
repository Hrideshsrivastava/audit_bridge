/* frontend/js/firm_dashboard.js */
import { apiFetch } from "./api.js";
import { requireFirmAuth, logout } from "./auth_guard.js";

requireFirmAuth();
window.logout = logout;

// Modal Logic
const modal = document.getElementById("addClientModal");
const addBtn = document.getElementById("addClientBtn");
const form = document.getElementById("addClientForm");

if(addBtn) addBtn.onclick = () => modal.showModal();

if(form) {
  form.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    
    try {
      const res = await apiFetch("/firm/create-client", {
        method: "POST", 
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });
      alert(`Success! Key: ${res.accessKey}`);
      modal.close();
      form.reset();
      loadDashboard();
    } catch(err) {
      alert("Failed: " + err.message);
    }
  };
}

// Dashboard Logic
async function loadDashboard() {
  try {
    const clients = await apiFetch("/firm/dashboard");
    const container = document.getElementById("clientsList");
    
    // Update Stats
    document.getElementById("statTotal").innerText = clients.length;
    document.getElementById("statActive").innerText = clients.length; // Placeholder logic
    
    container.innerHTML = "";
    if (clients.length === 0) {
      container.innerHTML = `<div style="padding:2rem; text-align:center; color:#64748b;">No clients found.</div>`;
      return;
    }

    clients.forEach(c => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.style.gridTemplateColumns = "2fr 2fr 1fr 1fr"; // Match header
      
      // Calculate Progress Color
      const percent = c.progressPercentage || 0;
      let progressColor = "#e2e8f0";
      if(percent > 0) progressColor = "#dbeafe";
      if(percent === 100) progressColor = "#d1fae5";

      row.innerHTML = `
        <div class="doc-name">${c.name} <div style="font-size:0.8rem; color:#94a3b8; font-weight:normal;">${c.email}</div></div>
        <div class="doc-desc">${c.auditType} (${c.financialYear})</div>
        <div>
           <div style="background:#f1f5f9; height:6px; width:100%; border-radius:3px; overflow:hidden;">
              <div style="background:${percent===100 ? '#10b981' : '#2563eb'}; height:100%; width:${percent}%"></div>
           </div>
           <div style="font-size:0.75rem; color:#64748b; margin-top:4px;">${c.submittedDocuments}/${c.totalDocuments} Docs</div>
        </div>
        <div style="text-align:center">
          <button class="btn-upload" style="background:white; border:1px solid #e2e8f0; color:#334155;" onclick="window.location.href='view_client.html?clientId=${c.clientId}'">View</button>
        </div>
      `;
      container.appendChild(row);
    });

  } catch (err) { console.error(err); }
}

loadDashboard();