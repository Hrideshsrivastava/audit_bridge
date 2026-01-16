/* server/utils/mailer.js */
const nodemailer = require("nodemailer");

// 1. Setup your email provider
const transporter = nodemailer.createTransport({
  service: "gmail", // Use 'gmail' or your SMTP host
  auth: {
    user: process.env.COMPANY_EMAIL, // e.g., 'yourcompany@gmail.com'
    pass: process.env.COMPANY_EMAIL_PASSWORD // App Password (not login password)
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