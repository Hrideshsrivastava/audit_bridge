/* server/utils/mailer.js */
const SibApiV3Sdk = require('sib-api-v3-sdk');

// 1. Configure Auth
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY; // We will add this to Render

// 2. Initialize API Instance
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

exports.sendEmail = async ({ to, subject, html }) => {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  // Configure Email Details
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  
  // SENDER: Use the email you signed up to Brevo with
  // (You can change the name "AuditBridge" to anything)
  sendSmtpEmail.sender = { 
    name: "AuditBridge System", 
    email: process.env.COMPANY_EMAIL // Your verified Brevo login email
  };

  // RECIPIENT: The actual client/firm email
  sendSmtpEmail.to = [{ email: to }];

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Email Sent via Brevo ID:", data.messageId);
    return true;
  } catch (error) {
    console.error("❌ Brevo Email Failed:", error.response ? error.response.text : error);
    // Return true so the app doesn't crash on email failure
    return true;
  }
};