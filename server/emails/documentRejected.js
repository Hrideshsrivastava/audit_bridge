exports.documentRejected = ({ name, docName, reason }) => `
<p>Dear ${name},</p>

<p>Your document <b>${docName}</b> has been rejected.</p>

<p><b>Reason:</b> ${reason}</p>

<p>Please re-upload the corrected document.</p>

<p>AuditBridge Team</p>
`;
