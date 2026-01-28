/* server/middleware/authMiddleware.js */
const jwt = require("jsonwebtoken");
const pool = require("../db");

/* ============================================
   FIRM AUTHENTICATION MIDDLEWARE
   Sets RLS context: app.current_firm_id
   ============================================ */
exports.firm = async (req, res, next) => {
  // Allow CORS preflight
  if (req.method === "OPTIONS") return next();

  let client;
  try {
    // 1️⃣ Extract and verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("❌ No authorization header");
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("❌ Malformed authorization header");
      return res.status(401).json({ error: "Invalid authorization format" });
    }

    const data = jwt.verify(token, process.env.JWT_SECRET);

    // Accept firmId (new) or id (old token format)
    const firmId = data.firmId || data.id;
    if (!firmId) {
      console.log("❌ Token missing firmId");
      return res.status(401).json({ error: "Invalid token structure" });
    }

    console.log(`✅ Firm authenticated: ${firmId}`);

    // 2️⃣ Get database connection from pool
    client = await pool.connect();

    // 3️⃣ Attach to request object
    req.firmId = firmId;
    req.db = client;

    // 4️⃣ Start transaction
    await client.query("BEGIN");
    
    // 5️⃣ Set RLS context for THIS transaction
    // This is CRITICAL - it ensures RLS policies work
    await client.query(
      "SELECT set_config('app.current_firm_id', $1, true)",
      [firmId.toString()]
    );

    console.log(`✅ RLS context set: app.current_firm_id = ${firmId}`);

    // 6️⃣ Clean up when response finishes
    res.on("finish", async () => {
      try {
        if (req.db) {
          await req.db.query("COMMIT");
          req.db.release();
          console.log(`✅ Transaction committed for firm ${firmId}`);
        }
      } catch (e) {
        console.error("❌ Error committing transaction:", e);
        try {
          await req.db.query("ROLLBACK");
        } catch (rollbackErr) {
          console.error("❌ Rollback error:", rollbackErr);
        }
        req.db.release();
      }
    });

    next();

  } catch (err) {
    // Handle errors and cleanup
    if (client) {
      try { 
        await client.query("ROLLBACK"); 
        console.log("⚠️ Transaction rolled back");
      } catch(e) {
        console.error("❌ Rollback error:", e);
      }
      client.release();
    }
    
    console.error("❌ Firm auth error:", err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    
    return res.status(401).json({ error: "Authentication failed" });
  }
};


/* ============================================
   CLIENT AUTHENTICATION MIDDLEWARE
   Sets RLS context: app.current_client_id
   ============================================ */
exports.client = async (req, res, next) => {
  // Allow CORS preflight
  if (req.method === "OPTIONS") return next();

  let client;
  try {
    // 1️⃣ Extract and verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("❌ No authorization header");
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("❌ Malformed authorization header");
      return res.status(401).json({ error: "Invalid authorization format" });
    }

    const data = jwt.verify(token, process.env.JWT_SECRET);

    if (!data.clientId) {
      console.log("❌ Token missing clientId");
      return res.status(401).json({ error: "Invalid token structure" });
    }

    console.log(`✅ Client authenticated: ${data.clientId}`);

    // 2️⃣ Get database connection from pool
    client = await pool.connect();

    // 3️⃣ Attach to request object
    req.clientId = data.clientId;
    req.db = client;

    // 4️⃣ Start transaction
    await client.query("BEGIN");

    // 5️⃣ Set RLS context for THIS transaction
    // This ensures client can ONLY see/modify their own data
    await client.query(
      "SELECT set_config('app.current_client_id', $1, true)",
      [req.clientId.toString()]
    );

    console.log(`✅ RLS context set: app.current_client_id = ${req.clientId}`);

    // 6️⃣ Clean up when response finishes
    res.on("finish", async () => {
      try {
        if (req.db) {
          await req.db.query("COMMIT");
          req.db.release();
          console.log(`✅ Transaction committed for client ${req.clientId}`);
        }
      } catch (e) {
        console.error("❌ Error committing client transaction:", e);
        try {
          await req.db.query("ROLLBACK");
        } catch (rollbackErr) {
          console.error("❌ Rollback error:", rollbackErr);
        }
        req.db.release();
      }
    });

    next();

  } catch (err) {
    // Handle errors and cleanup
    if (client) {
      try { 
        await client.query("ROLLBACK"); 
        console.log("⚠️ Client transaction rolled back");
      } catch(e) {
        console.error("❌ Rollback error:", e);
      }
      client.release();
    }
    
    console.error("❌ Client auth error:", err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    
    return res.status(401).json({ error: "Authentication failed" });
  }
};


/* ============================================
   TESTING FUNCTION (Optional)
   Use this to verify RLS is working
   ============================================ */
exports.testRLS = async (req, res) => {
  try {
    // Check current RLS settings
    const firmId = await req.db.query(
      "SELECT current_setting('app.current_firm_id', true)"
    );
    const clientId = await req.db.query(
      "SELECT current_setting('app.current_client_id', true)"
    );

    res.json({
      message: "RLS context verified",
      firmId: firmId.rows[0].current_setting,
      clientId: clientId.rows[0].current_setting,
      requestFirmId: req.firmId,
      requestClientId: req.clientId
    });
  } catch (err) {
    res.status(500).json({ 
      error: "RLS test failed", 
      message: err.message 
    });
  }
};