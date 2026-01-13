const router = require("express").Router();
const pool = require("../db");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const supabase = require("../utils/supabase");


router.post(
  "/document/:documentId/upload",
  auth.client,
  upload.single("file"),
  async (req, res) => {
    const { documentId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "File required" });
    }

    try {
      // 1️⃣ Fetch document (RLS enforced)
      const docRes = await req.db.query(
        `select
           cd.id,
           cd.status,
           cd.client_audit_id,
           ca.client_id,
           ca.firm_id
         from client_documents cd
         join client_audits ca on ca.id = cd.client_audit_id
         where cd.id = $1`,
        [documentId]
      );

      if (docRes.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" });
      }

      const doc = docRes.rows[0];

      // 2️⃣ Status validation
      if (doc.status === "verified") {
        return res
          .status(400)
          .json({ error: "Verified document cannot be replaced" });
      }

      // 3️⃣ Build storage path
      const path = `firm_${doc.firm_id}/client_${doc.client_id}/audit_${doc.client_audit_id}/${documentId}.pdf`;

      // 4️⃣ Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("audit-documents")
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // 5️⃣ Generate signed URL
      const { data: signed } = await supabase.storage
        .from("audit-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

      // 6️⃣ Update DB
      await req.db.query(
        `update client_documents
         set
           file_url = $1,
           uploaded_at = now(),
           status = 'submitted'
         where id = $2`,
        [signed.signedUrl, documentId]
      );

      res.json({ message: "File uploaded successfully" });
    } catch (err) {
      console.error(err);
      await req.db.query("ROLLBACK");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/**
 * GET /client/dashboard
 * Client overview
 */
router.get("/dashboard", auth.client, async (req, res) => {
  try {
    const result = await req.db.query(`
      select
        at.name as audit_type,
        ca.financial_year,

        count(cd.id) as total_documents,

        count(cd.id) filter (
          where cd.status in ('submitted', 'verified')
        ) as submitted_documents,

        count(cd.id) filter (
          where cd.status = 'pending'
          and cd.due_date < current_date
        ) as overdue_documents

      from client_audits ca
      join audit_types at on at.id = ca.audit_type_id
      left join client_documents cd on cd.client_audit_id = ca.id

      group by ca.id, at.name
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No audit found" });
    }

    const row = result.rows[0];

    const progress =
      row.total_documents === 0
        ? 0
        : Math.round(
            (row.submitted_documents / row.total_documents) * 100
          );

    res.json({
      auditType: row.audit_type,
      financialYear: row.financial_year,
      progressPercentage: progress,
      totalDocuments: row.total_documents,
      submittedDocuments: row.submitted_documents,
      overdueDocuments: row.overdue_documents
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load client dashboard" });
  }
});

/**
 * GET /client/documents
 * List required documents
 */
router.get("/documents", auth.client, async (req, res) => {
  try {
    const result = await req.db.query(`
      select
        cd.id as document_id,
        cd.document_name,
        cd.status,
        cd.due_date,
        cd.uploaded_at,
        cd.file_url
      from client_documents cd
      order by cd.due_date asc
    `);

    res.json(
      result.rows.map(r => ({
        documentId: r.document_id,
        name: r.document_name,
        status: r.status,
        dueDate: r.due_date,
        uploadedAt: r.uploaded_at,
        fileUrl: r.file_url
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

module.exports = router;
