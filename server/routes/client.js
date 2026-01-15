// /* backend/routes/client.js */
// const router = require("express").Router();
// const auth = require("../middleware/authMiddleware");
// const upload = require("../middleware/upload");

// // POST /client/document/:documentId/upload
// router.post(
//   "/document/:documentId/upload",
//   auth.client,
//   upload.single("file"), // Multer middleware processes the file first
//   async (req, res) => {
//     const { documentId } = req.params;
//     const file = req.file;

//     if (!file) {
//       return res.status(400).json({ error: "File required" });
//     }

//     try {
//       // 1. Check if document exists and isn't locked
//       const docRes = await req.db.query(
//         `select id, status from client_documents where id = $1`,
//         [documentId]
//       );

//       if (docRes.rows.length === 0) {
//         return res.status(404).json({ error: "Document not found" });
//       }

//       if (docRes.rows[0].status === "verified") {
//         return res.status(400).json({ error: "Verified document cannot be replaced" });
//       }

//       // 2. Construct the Public URL
//       // This creates a URL like: http://localhost:3000/uploads/123456-file.pdf
//       const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

//       // 3. Save URL to Database
//       await req.db.query(
//         `update client_documents
//          set
//            file_url = $1,
//            uploaded_at = now(),
//            status = 'submitted',
//            rejection_reason = null
//          where id = $2`,
//         [fileUrl, documentId]
//       );

//       res.json({ message: "File uploaded successfully", url: fileUrl });
      
//     } catch (err) {
//       console.error(err);
//       await req.db.query("ROLLBACK");
//       res.status(500).json({ error: "Upload failed" });
//     }
//   }
// );

// // ... Keep your existing GET /dashboard and GET /documents routes below ...
// // (Copy them from your previous file, they were correct)

// /**
//  * GET /client/dashboard
//  */
// router.get("/dashboard", auth.client, async (req, res) => {
//   try {
//     const result = await req.db.query(`
//       select
//         at.name as audit_type,
//         ca.financial_year,
//         count(cd.id) as total_documents,
//         count(cd.id) filter (where cd.status in ('submitted', 'verified')) as submitted_documents,
//         count(cd.id) filter (where cd.status = 'pending' and cd.due_date < current_date) as overdue_documents
//       from client_audits ca
//       join audit_types at on at.id = ca.audit_type_id
//       left join client_documents cd on cd.client_audit_id = ca.id
//       group by ca.id, at.name
//     `);

//     if (result.rows.length === 0) return res.status(404).json({ error: "No audit found" });
//     const row = result.rows[0];

//     res.json({
//       auditType: row.audit_type,
//       financialYear: row.financial_year,
//       progressPercentage: row.total_documents === 0 ? 0 : Math.round((row.submitted_documents / row.total_documents) * 100),
//       totalDocuments: row.total_documents,
//       submittedDocuments: row.submitted_documents,
//       overdueDocuments: row.overdue_documents
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to load dashboard" });
//   }
// });

// /**
//  * GET /client/documents
//  */
// /**
//  * GET /client/documents
//  * List documents ONLY for the logged-in client
//  */
// router.get("/documents", auth.client, async (req, res) => {
//   try {
//     // WE ADDED: JOIN client_audits AND WHERE ca.client_id = $1
//     const result = await req.db.query(`
//       SELECT
//         cd.id as document_id,
//         cd.document_name,
//         cd.status,
//         cd.due_date,
//         cd.uploaded_at,
//         cd.file_url
//       FROM client_documents cd
//       JOIN client_audits ca ON ca.id = cd.client_audit_id
//       WHERE ca.client_id = $1
//       ORDER BY cd.due_date ASC
//     `, [req.clientId]); // <--- This ensures they only see their own data

//     res.json(result.rows.map(r => ({
//       documentId: r.document_id,
//       name: r.document_name,
//       status: r.status,
//       dueDate: r.due_date,
//       uploadedAt: r.uploaded_at,
//       fileUrl: r.file_url
//     })));
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to load documents" });
//   }
// });

// module.exports = router;



/* backend/routes/client.js */
const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const supabase = require("../utils/supabase"); // ✅ Ensure you have this file in utils

// POST /client/document/:documentId/upload
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
      // 1. Fetch document details for organized folder structure
      const docRes = await req.db.query(
        `select 
           cd.id, cd.status, cd.client_audit_id, 
           ca.client_id, ca.firm_id
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
        return res.status(400).json({ error: "Verified document cannot be replaced" });
      }

      // 2. Define the Cloud Path
      // Structure: firm_ID / client_ID / audit_ID / filename.pdf
      const timestamp = Date.now();
      const fileExt = file.originalname.split('.').pop();
      const filePath = `firm_${doc.firm_id}/client_${doc.client_id}/audit_${doc.client_audit_id}/${documentId}_${timestamp}.${fileExt}`;

      // 3. Upload to Supabase Bucket
      const { error: uploadError } = await supabase.storage
        .from("audit-documents") // ✅ Make sure this Bucket exists!
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 4. Get the Public URL
      const { data: urlData } = supabase.storage
        .from("audit-documents")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 5. Save Cloud URL to Database
      await req.db.query(
        `update client_documents
         set
           file_url = $1,
           uploaded_at = now(),
           status = 'submitted',
           rejection_reason = null
         where id = $2`,
        [publicUrl, documentId]
      );

      res.json({ message: "File uploaded successfully", url: publicUrl });
      
    } catch (err) {
      console.error("Upload Error:", err);
      // Attempt rollback if DB transaction fails, though file might still be in cloud
      await req.db.query("ROLLBACK");
      res.status(500).json({ error: "Upload failed: " + err.message });
    }
  }
);

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
        ca.financial_year
      FROM client_documents cd
      JOIN client_audits ca ON ca.id = cd.client_audit_id
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
      financialYear: r.financial_year
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

module.exports = router;