/* frontend/js/client_dashboard.js - Enhanced Version */
import { apiFetch } from "./api.js";
import { requireAuth, logout } from "./auth_guard.js";

requireAuth();
window.logout = logout;

let uploadingDocuments = new Set(); // Track which documents are uploading

async function loadDashboard() {
  try {
    const docs = await apiFetch("/client/documents");
    
    // Calculate Metrics
    const total = docs.length;
    const submitted = docs.filter(d => d.status === 'uploaded' || d.status === 'verified' || d.status === 'submitted').length;
    
    // Update Top Cards
    document.getElementById("totalDocs").innerText = total;
    document.getElementById("submittedDocs").innerText = submitted;
    document.getElementById("clientNameDisplay").innerText = "Client Portal";

    // Render the List
    const container = document.getElementById("docsList");
    container.innerHTML = "";

    if (total === 0) {
      container.innerHTML = `<div style="padding: 2rem; text-align: center; color: #64748b;">No documents required.</div>`;
      return;
    }

    docs.forEach(doc => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.id = `doc-row-${doc.documentId}`;

      // Determine Status Styling
      let pillClass = "status-pending";
      let statusText = "Pending";
      
      if (doc.status === "uploaded" || doc.status === "submitted") { 
        pillClass = "status-uploaded"; 
        statusText = "Submitted"; 
      }
      if (doc.status === "verified") { 
        pillClass = "status-verified"; 
        statusText = "Verified"; 
      }
      if (doc.status === "rejected") { 
        pillClass = "status-pending"; 
        statusText = "Rejected"; 
      }

      // Determine Action Button
      let actionHtml = `<span style="color:#cbd5e1; font-size:1.5rem; text-align:center; display:block;">✓</span>`;
      
      if (doc.status !== "verified") {
        const btnText = doc.status === "rejected" ? "Re-Upload" : "Upload";
        const btnId = `upload-btn-${doc.documentId}`;
        actionHtml = `
          <label class="btn-upload" id="${btnId}">
            ${btnText}
            <input type="file" 
                   class="file-input-hidden" 
                   data-id="${doc.documentId}"
                   accept=".pdf,.jpg,.jpeg,.png">
          </label>
        `;
      }

      row.innerHTML = `
        <div class="doc-name">${doc.name}</div>
        <div class="doc-desc">Required for ${doc.financialYear || 'FY 2025-26'} Audit</div>
        <div><span class="status-pill ${pillClass}">${statusText}</span></div>
        <div style="text-align:center">${actionHtml}</div>
      `;
      container.appendChild(row);
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    alert("Failed to load dashboard. Please try refreshing the page.");
  }
}

// Enhanced File Upload Handler with Error Handling
document.addEventListener("change", async (e) => {
  if (e.target.classList.contains("file-input-hidden")) {
    const file = e.target.files[0];
    const docId = e.target.dataset.id;
    
    if (!file || !docId) return;

    // Prevent duplicate uploads
    if (uploadingDocuments.has(docId)) {
      alert("Upload already in progress for this document");
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size must be less than 10MB");
      e.target.value = ""; // Reset input
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF, JPG, and PNG files are allowed");
      e.target.value = "";
      return;
    }

    uploadingDocuments.add(docId);

    // Show uploading state
    const btn = document.getElementById(`upload-btn-${docId}`);
    const originalHTML = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = '<span style="opacity:0">Uploading...</span>'; // Text hidden, spinner shows

    try {
      const fd = new FormData();
      fd.append("file", file);

      const response = await fetch(`http://localhost:3000/client/document/${docId}/upload`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: fd
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      // Success - show brief success message
      btn.classList.remove('loading');
      btn.style.background = '#10b981';
      btn.innerHTML = '✓ Uploaded';
      
      // Refresh after short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err) {
      console.error("Upload error:", err);
      
      // Restore button
      btn.classList.remove('loading');
      btn.innerHTML = originalHTML;
      
      // Show user-friendly error
      alert(`Upload failed: ${err.message}\n\nPlease try again or contact support if the problem persists.`);
      
      // Reset file input
      e.target.value = "";
    } finally {
      uploadingDocuments.delete(docId);
    }
  }
});

// Initial load
loadDashboard();