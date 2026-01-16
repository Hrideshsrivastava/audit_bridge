/* server/utils/mailer.js */
const nodemailer = require("nodemailer");

// 1. Setup your email provider (Using Port 587 for Render compatibility)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",  // ✅ Explicitly set host
  port: 587,               // ✅ Use Port 587 (Standard for Cloud Hosting)
  secure: false,           // ✅ Must be false for port 587 (It uses STARTTLS automatically)
  auth: {
    user: process.env.COMPANY_EMAIL,
    pass: process.env.COMPANY_EMAIL_PASSWORD
  }
});

// 2. Generic Send Function
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"AuditBridge System" <${process.env.COMPANY_EMAIL}>`,
      to: to,
      subject: subject,
      html: html
    });
    console.log(`📧 Email sent: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error("❌ Email failed:", err);
    return false;
  }
};

module.exports = { sendEmail };