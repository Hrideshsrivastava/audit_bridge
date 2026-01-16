/* backend/app.js */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path"); // Import path

const app = express();

app.use(cors());
app.use(express.json());
require("./emails/emailScheduler");
// 1. Serve Uploaded Files Staticially
// This makes http://localhost:3000/uploads/file.pdf accessible
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/auth", require("./routes/auth"));
app.use("/firm", require("./routes/firm"));
app.use("/client", require("./routes/client"));
// Note: You can remove app.use("/documents") as we will handle uploads in client.js

// Transaction cleanup middleware
app.use(async (req, res, next) => {
  if (req.db) {
    try {
      await req.db.query("COMMIT");
      req.db.release();
    } catch {
      if(req.db) req.db.release();
    }
  }
  next();
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});