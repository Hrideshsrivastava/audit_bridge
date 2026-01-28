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


/* ============================
   FIRM ROUTES
   ============================ */
router.post("/firm/signup", async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    await pool.query("insert into firms(name,email,password_hash) values($1,$2,$3)", [name, email, hash]);
    res.json({ message: "Firm created" });
  } catch (err) {
    res.status(400).json({ error: "Email already exists" });
  }
});

router.post("/firm/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query("select * from firms where email=$1", [email]);
  
  if (!result.rows.length) return res.status(401).json({ error: "Invalid credentials" });
  
  const firm = result.rows[0];
  const ok = await bcrypt.compare(password, firm.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ firmId: firm.id }, process.env.JWT_SECRET);
  res.json({ token });
});

/* ============================
   CLIENT ROUTES
   ============================ */

// 1. FIRST TIME ACTIVATION (Key -> Password)
router.post("/client/activate", async (req, res) => {
  const { access_key, password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    // Verify key exists and isn't already used
    const result = await pool.query(
      `update clients 
       set password_hash=$1, is_active=true, access_key=NULL 
       where access_key=$2 
       returning id, email`,
      [hash, access_key]
    );

    if (!result.rows.length) {
      return res.status(400).json({ error: "Invalid or expired Access Key" });
    }

    const client = result.rows[0];
    const token = jwt.sign({ clientId: client.id }, process.env.JWT_SECRET);
    
    res.json({ token, email: client.email });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Activation failed" });
  }
});

// 2. RETURNING LOGIN (Email + Password) -> ✅ THIS WAS MISSING
router.post("/client/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("select * from clients where email=$1", [email]);
    
    if (!result.rows.length) return res.status(401).json({ error: "Invalid credentials" });
    
    const client = result.rows[0];
    
    // Check if they activated their account first
    if (!client.is_active) {
      return res.status(403).json({ error: "Account not active. Please use your Access Key first." });
    }

    const ok = await bcrypt.compare(password, client.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ clientId: client.id }, process.env.JWT_SECRET);
    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
