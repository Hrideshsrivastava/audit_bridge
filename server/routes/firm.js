const router = require("express").Router();
const crypto = require("crypto");
const auth = require("../middleware/authMiddleware");

/**
 * POST /firm/create-client
 */
router.post("/create-client", auth.firm, async (req, res) => {
  const { name, email, audit_type_id, financial_year } = req.body;
  const accessKey = crypto.randomBytes(16).toString("hex");

  try {
    const client = await req.db.query(
      `insert into clients(name,email,access_key,created_by_firm_id)
       values($1,$2,$3,$4)
       returning id`,
      [name, email, accessKey, req.firmId]
    );

    const clientId = client.rows[0].id;

    await req.db.query(
      `insert into firm_clients(firm_id, client_id)
       values($1,$2)`,
      [req.firmId, clientId]
    );

    const audit = await req.db.query(
      `insert into client_audits(client_id,audit_type_id,financial_year,firm_id)
       values($1,$2,$3,$4)
       returning id`,
      [clientId, audit_type_id, financial_year, req.firmId]
    );

    const auditId = audit.rows[0].id;

    await req.db.query(
      `insert into client_documents (client_audit_id, document_name, firm_id)
       select $1, document_name, $2
       from audit_documents_template
       where audit_type_id = $3`,
      [auditId, req.firmId, audit_type_id]
    );

    res.json({ accessKey });
  } catch (err) {
    console.error(err);
    await req.db.query("ROLLBACK");
    res.status(500).json({ error: "Failed to create client" });
  }
});

/**
 * PATCH /firm/document/:documentId
 */
router.patch("/document/:documentId", auth.firm, async (req, res) => {
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

    if (!docRes.rows.length) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (docRes.rows[0].status !== "submitted") {
      return res.status(400).json({
        error: "Only submitted documents can be updated"
      });
    }

    if (status === "verified") {
      await req.db.query(
        `update client_documents
         set status = 'verified', rejection_reason = null
         where id = $1`,
        [documentId]
      );
    } else {
      if (!rejectionReason) {
        return res.status(400).json({ error: "Rejection reason required" });
      }

      await req.db.query(
        `update client_documents
         set status = 'rejected', rejection_reason = $1
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
});

/**
 * GET /firm/dashboard
 */
router.get("/dashboard", auth.firm, async (req, res) => {
  try {
    const result = await req.db.query(`
      select
        c.id as client_id,
        c.name as client_name,
        c.email as client_email,
        at.name as audit_type,
        ca.financial_year,

        count(cd.id) as total_documents,
        count(cd.id) filter (where cd.status in ('submitted','verified')) as submitted_documents,
        count(cd.id) filter (where cd.status = 'verified') as verified_documents,
        count(cd.id) filter (where cd.status = 'pending' and cd.due_date < current_date) as overdue_documents

      from clients c
      join client_audits ca on ca.client_id = c.id
      join audit_types at on at.id = ca.audit_type_id
      left join client_documents cd on cd.client_audit_id = ca.id

      WHERE ca.firm_id = $1  -- ✅ ADDED: Explicitly filter by logged-in Firm ID

      group by c.id, ca.id, at.name
      order by c.created_at desc
    `, [req.firmId]); // ✅ ADDED: Pass the firmId parameter

    const dashboard = result.rows.map(row => ({
      clientId: row.client_id,
      name: row.client_name,
      email: row.client_email,
      auditType: row.audit_type,
      financialYear: row.financial_year,
      progressPercentage:
        row.total_documents === 0
          ? 0
          : Math.round((row.submitted_documents / row.total_documents) * 100),
      totalDocuments: row.total_documents,
      submittedDocuments: row.submitted_documents,
      verifiedDocuments: row.verified_documents,
      overdueDocuments: row.overdue_documents
    }));

    res.json(dashboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});
/**
 * GET /firm/client/:clientId
 */
router.get("/client/:clientId", auth.firm, async (req, res) => {
  try {
    const { clientId } = req.params;

    const result = await req.db.query(`
      select
        c.name as client_name,
        c.email as client_email,
        at.name as audit_type,
        ca.financial_year,

        cd.id as document_id,
        cd.document_name,
        cd.status,
        cd.due_date,
        cd.uploaded_at,
        cd.file_url

      from clients c
      join client_audits ca on ca.client_id = c.id
      join audit_types at on at.id = ca.audit_type_id
      left join client_documents cd on cd.client_audit_id = ca.id

      where c.id = $1
      order by cd.due_date asc
    `, [clientId]);

    if (!result.rows.length) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({
      clientName: result.rows[0].client_name,
      email: result.rows[0].client_email,
      auditType: result.rows[0].audit_type,
      financialYear: result.rows[0].financial_year,
      documents: result.rows.map(r => ({
        documentId: r.document_id,
        name: r.document_name,
        status: r.status,
        dueDate: r.due_date,
        uploadedAt: r.uploaded_at,
        fileUrl: r.file_url
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load client details" });
  }
});

/**
 * ✅ NEW: Update just the Due Date of a document
 * PATCH /firm/document/:documentId/due-date
 */
router.patch("/document/:documentId/due-date", auth.firm, async (req, res) => {
  const { documentId } = req.params;
  const { due_date } = req.body; // Expect YYYY-MM-DD

  try {
    // Update the date
    await req.db.query(
      `update client_documents
       set due_date = $1
       where id = $2 and firm_id = $3`,
      [due_date, documentId, req.firmId]
    );

    res.json({ message: "Due date updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update date" });
  }
});

module.exports = router;
