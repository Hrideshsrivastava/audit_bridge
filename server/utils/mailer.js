/* server/utils/mailer.js */
const { Resend } = require("resend");

// Initialize Resend with the key from your .env / Render Environment
const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendEmail = async ({ to, subject, html }) => {
  try {
    // NOTE: On the free tier, you can ONLY send emails to the address 
    // you signed up with (your own email).
    const data = await resend.emails.send({
      from: "AuditBridge <onboarding@resend.dev>", // Use their free testing domain
      to: to, 
      subject: subject,
      html: html
    });
    
    console.log("✅ Email Sent via Resend:", data.id);
    return true;
  } catch (err) {
    console.error("❌ Email Failed:", err);
    // Return true anyway so the upload doesn't fail just because email failed
    return true; 
  }
};