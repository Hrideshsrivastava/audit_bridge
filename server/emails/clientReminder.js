exports.clientReminder = ({ name, docName, dueDate }) => `
<p>Dear ${name},</p>

<p>This is a reminder to upload the following document:</p>

<p><b>${docName}</b><br/>
Due Date: <b>${dueDate}</b></p>

<p>Please log in to your AuditBridge portal to upload the document.</p>

<p>Regards,<br/>AuditBridge Team</p>
`;
