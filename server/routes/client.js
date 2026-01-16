

/* backend/routes/client.js */
const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const supabase = require("../utils/supabase"); // ✅ Ensure you have this file in utils

// POST /client/document/:documentId/upload
/* server/routes/client.js */

// ... (imports remain the same) ...
const { sendEmail } = require("../utils/mailer"); // ✅ Import Mailer

router.post(
  "/document/:documentId/upload",
  auth.client,
  upload.single("file"), 
  async (req, res) => {
    const { documentId } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "File required" });

    try {
      // 1. Get Details + FIRM EMAIL
      const docRes = await req.db.query(
        `select 
           cd.id, cd.document_name, cd.status, cd.client_audit_id, 
           ca.client_id, ca.firm_id,
           f.email as firm_email, f.name as firm_name,
           c.name as client_name
         from client_documents cd
         join client_audits ca on ca.id = cd.client_audit_id
         join firms f on f.id = ca.firm_id      
         join clients c on c.id = ca.client_id  
         where cd.id = $1`,
        [documentId]
      );

      if (docRes.rows.length === 0) return res.status(404).json({ error: "Doc not found" });
      const doc = docRes.rows[0];

      if (doc.status === "verified") return res.status(400).json({ error: "Cannot replace verified doc" });

      // 2. Upload Logic (Supabase)
      const timestamp = Date.now();
      const fileExt = file.originalname.split('.').pop();
      const filePath = `firm_${doc.firm_id}/client_${doc.client_id}/${documentId}_${timestamp}.${fileExt}`;

      const { error: upErr } = await supabase.storage
        .from("audit-documents")
        .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("audit-documents").getPublicUrl(filePath);

      // 3. Update DB
      await req.db.query(
        `update client_documents 
         set file_url = $1, uploaded_at = now(), status = 'submitted', rejection_reason = null
         where id = $2`,
        [urlData.publicUrl, documentId]
      );

      // 4. ✅ EVENT: EMAIL THE FIRM
      if (doc.firm_email) {
        await sendEmail({
          to: doc.firm_email,
          subject: `📄 Action Required: ${doc.client_name} uploaded a document`,
          html: `
            <h3>Document Submitted</h3>
            <p><b>Client:</b> ${doc.client_name}</p>
            <p><b>Document:</b> ${doc.document_name}</p>
            <p>Please log in to your dashboard to Verify or Reject this document.</p>
          `
        });
      }

      res.json({ message: "Uploaded successfully", url: urlData.publicUrl });
      
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);
// ... (keep the rest of the file)

// ... (Keep your existing GET /dashboard and GET /documents routes below exactly as they were) ...
// The GET routes don't need changing because they just read the URL we saved above.

/**
 * GET /client/dashboard
 */
router.get("/dashboard", auth.client, async (req, res) => {
  try {
    const result = await req.db.query(`
      select
        at.name as audit_type,
        ca.financial_year,
        count(cd.id) as total_documents,
        count(cd.id) filter (where cd.status in ('submitted', 'verified')) as submitted_documents,
        count(cd.id) filter (where cd.status = 'pending' and cd.due_date < current_date) as overdue_documents
      from client_audits ca
      join audit_types at on at.id = ca.audit_type_id
      left join client_documents cd on cd.client_audit_id = ca.id
      where ca.client_id = $1
      group by ca.id, at.name
    `, [req.clientId]);

    if (result.rows.length === 0) return res.status(404).json({ error: "No audit found" });
    const row = result.rows[0];

    res.json({
      auditType: row.audit_type,
      financialYear: row.financial_year,
      progressPercentage: row.total_documents === 0 ? 0 : Math.round((row.submitted_documents / row.total_documents) * 100),
      totalDocuments: row.total_documents,
      submittedDocuments: row.submitted_documents,
      overdueDocuments: row.overdue_documents
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

/**
 * GET /client/documents
 * List documents ONLY for the logged-in client
 */
router.get("/documents", auth.client, async (req, res) => {
  try {
    const result = await req.db.query(`
      SELECT
        cd.id as document_id,
        cd.document_name,
        cd.status,
        cd.due_date,
        cd.uploaded_at,
        cd.file_url,
        ca.financial_year,
        at.name as audit_type    -- ✅ 1. Get Audit Type Name
      FROM client_documents cd
      JOIN client_audits ca ON ca.id = cd.client_audit_id
      JOIN audit_types at ON at.id = ca.audit_type_id  -- ✅ 2. Join Audit Types Table
      WHERE ca.client_id = $1
      ORDER BY cd.due_date ASC
    `, [req.clientId]);

    res.json(result.rows.map(r => ({
      documentId: r.document_id,
      name: r.document_name,
      status: r.status,
      dueDate: r.due_date,
      uploadedAt: r.uploaded_at,
      fileUrl: r.file_url,
      financialYear: r.financial_year,
      auditType: r.audit_type   // ✅ 3. Send to Frontend
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});


module.exports = router;