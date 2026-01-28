/* frontend/js/client_dashboard.js */
import { apiFetch } from "./api.js";
import { requireAuth, logout } from "./auth_guard.js";

requireAuth();
window.logout = logout;

let uploadingDocuments = new Set();

async function loadDashboard() {
  try {
    const docs = await apiFetch("/client/documents");
    
    // --- METRICS UPDATE ---
    const total = docs.length;
    const submitted = docs.filter(d => ['uploaded', 'verified', 'submitted'].includes(d.status)).length;
    
    document.getElementById("totalDocs").innerText = total;
    document.getElementById("submittedDocs").innerText = submitted;
    document.getElementById("clientNameDisplay").innerText = "Client Portal";

    // 1. Update Compliance/Audit Type
    if (docs.length > 0 && docs[0].auditType) {
        document.getElementById("auditType").innerText = docs[0].auditType;
    }

    // ============================================================
    // ✅ 2. MODIFIED: Update Deadline Card (Next Actionable Item)
    // ============================================================
    const deadlineEl = document.getElementById("deadline");

    // Filter: Exclude finished items (uploaded/submitted/verified).
    // Keep 'pending' and 'rejected' items.
    const actionableDocs = docs.filter(d => 
        !['uploaded', 'verified', 'submitted'].includes(d.status) && d.dueDate
    );
    
    if (actionableDocs.length > 0) {
        // Sort dates ASCENDING (Earliest first)
        actionableDocs.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        // Pick the CLOSEST pending date (Index 0)
        const nextDoc = actionableDocs[0];
        const closest = new Date(nextDoc.dueDate);
        
        // Check Urgency for the Card
        const today = new Date();
        today.setHours(0,0,0,0);
        closest.setHours(0,0,0,0);
        
        const diffTime = closest - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Format Date
        deadlineEl.innerText = closest.toLocaleDateString('en-GB', { 
            day: 'numeric', month: 'short', year: 'numeric' 
        });

        // Apply Card Color (Red if Overdue or <= 5 days)
        if (diffDays <= 5) {
            deadlineEl.style.color = "#dc2626"; // Red
            deadlineEl.style.fontWeight = "700";
        } else {
            deadlineEl.style.color = "#1e293b"; // Standard Dark Blue/Black
            deadlineEl.style.fontWeight = "600";
        }
    } else {
        // Handle case where everything is done
        if (total > 0 && total === submitted) {
            deadlineEl.innerText = "All Submitted";
            deadlineEl.style.color = "#10b981"; // Green
        } else {
            deadlineEl.innerText = "No Deadline";
            deadlineEl.style.color = "#1e293b";
        }
    }
    // ============================================================
    // END OF MODIFICATION
    // ============================================================


    // Render List
    const container = document.getElementById("docsList");
    container.innerHTML = "";

    if (total === 0) {
      container.innerHTML = `<div style="padding: 2rem; text-align: center; color: #64748b;">No documents required.</div>`;
      return;
    }

    docs.forEach(doc => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.style.gridTemplateColumns = "2fr 2fr 1.5fr 1fr 1fr"; 
      row.id = `doc-row-${doc.documentId}`;

      // --- Date & Status Logic ---
      let dateHtml = '<span style="color:#94a3b8">No Deadline</span>';
      let statusText = "Not Uploaded"; 
      let pillClass = "status-neutral"; 
      let pillStyle = "background: #f1f5f9; color: #64748b;"; 

      // Check DB Status First
      if (['uploaded', 'submitted'].includes(doc.status)) { 
          pillClass = "status-uploaded"; 
          pillStyle = ""; 
          statusText = "Submitted";
          if(doc.dueDate) {
             const d = new Date(doc.dueDate);
             dateHtml = `<span style="color:#475569">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>`;
          }
      } 
      else if (doc.status === "verified") { 
          pillClass = "status-verified"; 
          pillStyle = ""; 
          statusText = "Verified";
          if(doc.dueDate) {
             const d = new Date(doc.dueDate);
             dateHtml = `<span style="color:#475569">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>`;
          }
      } 
      else if (doc.status === "rejected") { 
          pillClass = "status-pending"; 
          pillStyle = ""; 
          statusText = "Rejected"; 
          if(doc.dueDate) {
             const d = new Date(doc.dueDate);
             // Red date for rejected items
             dateHtml = `<span style="color:#dc2626; font-weight:600;">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>`;
          }
      } 
      else {
          // PENDING (Not Uploaded)
          if (doc.dueDate) {
              const dateObj = new Date(doc.dueDate);
              const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              
              const today = new Date();
              today.setHours(0,0,0,0);
              const due = new Date(doc.dueDate);
              due.setHours(0,0,0,0);

              const timeDiff = due - today;
              const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

              if (daysLeft < 0) {
                  // A. OVERDUE
                  statusText = "Pending";
                  pillClass = "status-pending"; 
                  pillStyle = "";
                  // Red Date
                  dateHtml = `<span style="color:#dc2626; font-weight:700;">${formattedDate}</span>`;
                  
              } else if (daysLeft <= 30) {
                  // B. COMING SOON
                  statusText = "Not Uploaded";
                  
                  // Red if <= 5 days, Black if 6-30 days
                  const textColor = daysLeft <= 5 ? "#dc2626" : "#1e293b"; 
                  const fontWeight = daysLeft <= 5 ? "700" : "500";
                  
                  dateHtml = `<span style="color:${textColor}; font-weight:${fontWeight};">${daysLeft} days left</span>`;
                  
                  if(daysLeft <= 5) {
                      pillStyle = "background: #fee2e2; color: #dc2626;"; // Urgent pill
                  }

              } else {
                  // C. FUTURE (> 30 Days)
                  statusText = "Not Uploaded";
                  dateHtml = `<span style="color:#475569;">${formattedDate}</span>`;
              }
          } else {
              statusText = "Not Uploaded";
          }
      }

      // Action Button
      let actionHtml = `<span style="color:#cbd5e1; font-size:1.5rem; text-align:center; display:block;">✓</span>`;
      if (doc.status !== "verified") {
        const btnText = doc.status === "rejected" ? "Re-Upload" : "Upload";
        const btnId = `upload-btn-${doc.documentId}`;
        actionHtml = `
          <label class="btn-upload" id="${btnId}">
            ${btnText}
            <input type="file" class="file-input-hidden" data-id="${doc.documentId}" accept=".pdf,.jpg,.jpeg,.png">
          </label>
        `;
      }

      row.innerHTML = `
        <div class="doc-name">${doc.name}</div>
        <div class="doc-desc">Required for ${doc.financialYear || 'Audit'}</div>
        <div>${dateHtml}</div>
        <div><span class="status-pill ${pillClass}" style="${pillStyle}">${statusText}</span></div>
        <div style="text-align:center">${actionHtml}</div>
      `;
      container.appendChild(row);
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    alert("Failed to load dashboard.");
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