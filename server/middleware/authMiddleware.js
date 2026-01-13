const jwt = require("jsonwebtoken");
const pool = require("../db");

exports.firm = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const data = jwt.verify(token, process.env.JWT_SECRET);

    req.firmId = data.firmId;

    // 🔐 Set session variable for RLS
    await pool.query(
      "set app.current_firm_id = $1",
      [req.firmId]
    );

    next();
  } catch (err) {
    res.sendStatus(401);
  }
};
