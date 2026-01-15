/* server/middleware/upload.js */
const multer = require("multer");

// ✅ Switch to Memory Storage
// This keeps the file in RAM as a "Buffer" so we can send it to Supabase
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, JPG, and PNG allowed."));
    }
  }
});

module.exports = upload;