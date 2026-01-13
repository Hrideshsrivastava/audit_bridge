const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/* Firm Signup */
router.post("/firm/signup", async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    "insert into firms(name,email,password_hash) values($1,$2,$3)",
    [name, email, hash]
  );

  res.json({ message: "Firm created" });
});

/* Firm Login */
router.post("/firm/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "select * from firms where email=$1",
    [email]
  );

  if (!result.rows.length) return res.sendStatus(401);

  const firm = result.rows[0];
  const ok = await bcrypt.compare(password, firm.password_hash);
  if (!ok) return res.sendStatus(401);

  const token = jwt.sign({ firmId: firm.id }, process.env.JWT_SECRET);
  res.json({ token });
});

/* Client Activation */
router.post("/client/activate", async (req, res) => {
  const { access_key, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    "update clients set password_hash=$1, is_active=true where access_key=$2 returning id",
    [hash, access_key]
  );

  if (!result.rows.length) return res.sendStatus(400);

  const token = jwt.sign({ clientId: result.rows[0].id }, process.env.JWT_SECRET);
  res.json({ token });
});

module.exports = router;
