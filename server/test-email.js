/* server/test-email.js */
require("dotenv").config();
const nodemailer = require("nodemailer");

async function testConnection() {
  console.log("🔍 1. Checking Environment Variables...");
  if (!process.env.COMPANY_EMAIL || !process.env.COMPANY_EMAIL_PASSWORD) {
    console.error("❌ ERROR: COMPANY_EMAIL or COMPANY_EMAIL_PASSWORD is missing in .env");
    return;
  }
  console.log("   ✅ Credentials found for:", process.env.COMPANY_EMAIL);

  console.log("🔌 2. Connecting to SMTP Server...");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.COMPANY_EMAIL,
      pass: process.env.COMPANY_EMAIL_PASSWORD
    }
  });

  try {
    // Verify connection configuration
    await transporter.verify();
    console.log("   ✅ SMTP Connection Successful!");

    console.log("📨 3. Sending Test Email...");
    const info = await transporter.sendMail({
      from: `"Debug Bot" <${process.env.COMPANY_EMAIL}>`,
      to: process.env.COMPANY_EMAIL, // Send to yourself to test
      subject: "✅ Test Email from AuditBridge",
      text: "If you are reading this, your email system is working perfectly!",
    });

    console.log("   ✅ Email Sent!");
    console.log("   🆔 Message ID:", info.messageId);
    console.log("   🔗 Preview URL:", nodemailer.getTestMessageUrl(info));

  } catch (err) {
    console.error("❌ FATAL ERROR: Could not send email.");
    console.error("------------------------------------------------");
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);
    if (err.response) console.error("SMTP Response:", err.response);
    console.error("------------------------------------------------");

    if (err.code === 'EAUTH') {
      console.log("💡 HINT: This is an AUTHENTICATION error.");
      console.log("   1. Are you using your normal login password? You MUST use an 'App Password'.");
      console.log("   2. Go to Google Account -> Security -> 2-Step Verification -> App Passwords.");
      console.log("   3. Generate one and paste that 16-character code into your .env file.");
    }
  }
}

testConnection();