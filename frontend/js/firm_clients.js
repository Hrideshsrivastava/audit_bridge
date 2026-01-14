import { apiFetch } from "./api.js";
import { requireAuth } from "./auth_guard.js";

requireAuth();

const clientId = new URLSearchParams(location.search).get("clientId");
const data = await apiFetch(`/firm/client/${clientId}`);

document.getElementById("clientName").innerText = data.clientName;

const table = document.getElementById("docs");
table.innerHTML = `<tr><th>Doc</th><th>Status</th><th>Action</th></tr>`;

data.documents.forEach(d => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${d.name}</td>
    <td>${d.status}</td>
    <td>
      ${d.status === "submitted"
        ? `<button onclick="verify('${d.documentId}')">Verify</button>
           <button onclick="reject('${d.documentId}')">Reject</button>`
        : "-"}
    </td>
  `;
  table.appendChild(row);
});

window.verify = async id => {
  await apiFetch(`/firm/document/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "verified" })
  });
  location.reload();
};

window.reject = async id => {
  const reason = prompt("Reason?");
  await apiFetch(`/firm/document/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "rejected", rejectionReason: reason })
  });
  location.reload();
};
