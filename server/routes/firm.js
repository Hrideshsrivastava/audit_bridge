const router = require("express").Router();
const pool = require("../db");
const crypto = require("crypto");
const auth = require("../middleware/authMiddleware");

router.post("/create-client", auth.firm, async (req, res) => {
  const { name, email, audit_type_id, financial_year } = req.body;
  const accessKey = crypto.randomBytes(16).toString("hex");

  try {
    // 1️⃣ Create client
    const client = await req.db.query(
      `insert into clients(name,email,access_key,created_by_firm_id)
       values($1,$2,$3,$4)
       returning id`,
      [name, email, accessKey, req.firmId]
    );

    const clientId = client.rows[0].id;

    // 2️⃣ Firm-client relation
    await req.db.query(
      `insert into firm_clients(firm_id, client_id)
       values($1,$2)`,
      [req.firmId, clientId]
    );

    // 3️⃣ Create audit
    const audit = await req.db.query(
      `insert into client_audits(client_id,audit_type_id,financial_year,firm_id)
       values($1,$2,$3,$4)
       returning id`,
      [clientId, audit_type_id, financial_year, req.firmId]
    );

    const auditId = audit.rows[0].id;

    // 4️⃣ Generate required documents
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
 * GET /firm/dashboard
 * Returns client cards with progress metrics
 */
router.get("/dashboard", auth.firm, async (req, res) => {
  try {
    const result = await pool.query(`
      select
        c.id as client_id,
        c.name as client_name,
        c.email as client_email,
        at.name as audit_type,
        ca.financial_year,

        count(cd.id) as total_documents,

        count(cd.id) filter (
          where cd.status in ('submitted', 'verified')
        ) as submitted_documents,

        count(cd.id) filter (
          where cd.status = 'verified'
        ) as verified_documents,

        count(cd.id) filter (
          where cd.status = 'pending'
          and cd.due_date < current_date
        ) as overdue_documents

      from clients c
      join client_audits ca on ca.client_id = c.id
      join audit_types at on at.id = ca.audit_type_id
      left join client_documents cd on cd.client_audit_id = ca.id

      group by c.id, ca.id, at.name
      order by c.created_at desc
    `);

    const dashboard = result.rows.map(row => {
      const progress =
        row.total_documents === 0
          ? 0
          : Math.round(
              (row.submitted_documents / row.total_documents) * 100
            );

      return {
        clientId: row.client_id,
        name: row.client_name,
        email: row.client_email,
        auditType: row.audit_type,
        financialYear: row.financial_year,
        progressPercentage: progress,
        totalDocuments: row.total_documents,
        submittedDocuments: row.submitted_documents,
        verifiedDocuments: row.verified_documents,
        overdueDocuments: row.overdue_documents
      };
    });

    res.json(dashboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});


/**
 * GET /firm/client/:clientId
 * Detailed audit + documents
 */
router.get("/client/:clientId", auth.firm, async (req, res) => {
  try {
    const { clientId } = req.params;

    const result = await pool.query(`
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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const header = {
      clientName: result.rows[0].client_name,
      email: result.rows[0].client_email,
      auditType: result.rows[0].audit_type,
      financialYear: result.rows[0].financial_year
    };

    const documents = result.rows.map(r => ({
      documentId: r.document_id,
      name: r.document_name,
      status: r.status,
      dueDate: r.due_date,
      uploadedAt: r.uploaded_at,
      fileUrl: r.file_url
    }));

    res.json({ ...header, documents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load client details" });
  }
});


module.exports = router;
