const router = require("express").Router();
const pool = require("../db");
const crypto = require("crypto");
const auth = require("../middleware/authMiddleware");

router.post("/create-client", auth.firm, async (req, res) => {
  const { name, email, audit_type_id, financial_year } = req.body;
  const accessKey = crypto.randomBytes(16).toString("hex");

  const client = await pool.query(
    "insert into clients(name,email,access_key) values($1,$2,$3) returning id",
    [name, email, accessKey]
  );

  await pool.query(
    "insert into firm_clients values($1,$2)",
    [req.firmId, client.rows[0].id]
  );

  const audit = await pool.query(
    "insert into client_audits(client_id,audit_type_id,financial_year) values($1,$2,$3) returning id",
    [client.rows[0].id, audit_type_id, financial_year]
  );

  await pool.query(`
    insert into client_documents (client_audit_id, document_name)
    select $1, document_name from audit_documents_template
    where audit_type_id = $2
  `, [audit.rows[0].id, audit_type_id]);

  res.json({ accessKey });
});

module.exports = router;
