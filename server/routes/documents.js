const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const supabase = require("../utils/supabase");

/**
 * CLIENT: Upload / re-upload document
 * POST /client/document/:documentId/upload
 */
router.post(
  "/client/document/:documentId/upload",
  auth.client,
  upload.single("file"),
  async (req, res) => {
    const { documentId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "File is required" });
    }

    try {
      // Fetch document (RLS enforced)
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

      if (doc.status === "verified") {
        return res
          .status(400)
          .json({ error: "Verified document cannot be replaced" });
      }

      const path = `firm_${doc.firm_id}/client_${doc.client_id}/audit_${doc.client_audit_id}/${documentId}.pdf`;

      const { error } = await supabase.storage
        .from("audit-documents")
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (error) throw error;

      const { data } = await supabase.storage
        .from("audit-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      await req.db.query(
        `update client_documents
         set
           file_url = $1,
           uploaded_at = now(),
           status = 'submitted'
         where id = $2`,
        [data.signedUrl, documentId]
      );

      res.json({ message: "Document uploaded successfully" });
    } catch (err) {
      console.error(err);
      await req.db.query("ROLLBACK");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/**
 * FIRM: Verify / reject document
 * PATCH /firm/document/:documentId
 */
router.patch(
  "/firm/document/:documentId",
  auth.firm,
  async (req, res) => {
    const { documentId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const docRes = await req.db.query(
        `select id, status
         from client_documents
         where id = $1`,
        [documentId]
      );

      if (docRes.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" });
      }

      const doc = docRes.rows[0];

      if (doc.status !== "submitted") {
        return res.status(400).json({
          error: `Cannot change status from '${doc.status}'`
        });
      }

      if (status === "verified") {
        await req.db.query(
          `update client_documents
           set status = 'verified',
               rejection_reason = null
           where id = $1`,
          [documentId]
        );
      } else {
        if (!rejectionReason) {
          return res.status(400).json({
            error: "Rejection reason required"
          });
        }

        await req.db.query(
          `update client_documents
           set status = 'rejected',
               rejection_reason = $1
           where id = $2`,
          [rejectionReason, documentId]
        );
      }

      res.json({ message: `Document ${status}` });
    } catch (err) {
      console.error(err);
      await req.db.query("ROLLBACK");
      res.status(500).json({ error: "Verification failed" });
    }
  }
);

module.exports = router;
