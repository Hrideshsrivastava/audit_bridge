const jwt = require("jsonwebtoken");
const pool = require("../db");

exports.firm = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const data = jwt.verify(token, process.env.JWT_SECRET);

    req.firmId = data.firmId;
    req.db = client;

    await client.query("BEGIN");
    await client.query("SET app.current_firm_id = $1", [req.firmId]);

    next();
  } catch (err) {
    await client.release();
    res.sendStatus(401);
  }
};

exports.client = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const data = jwt.verify(token, process.env.JWT_SECRET);

    req.clientId = data.clientId;
    req.db = client;

    await client.query("BEGIN");
    await client.query("SET app.current_client_id = $1", [req.clientId]);

    next();
  } catch (err) {
    await client.release();
    res.sendStatus(401);
  }
};
