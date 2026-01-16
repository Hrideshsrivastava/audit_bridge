/* server/utils/scheduler.js */
const cron = require("node-cron");
const pool = require("../db");
const { sendEmail } = require("./mailer");

// Run every day at 10:00 AM
cron.schedule("0 10 * * *", async () => {
  console.log("⏰ Running Daily Email Scheduler...");
  const client = await pool.connect();

  try {
    // ==========================================
    // 1. CLIENT REMINDERS (5 Days, 1 Day, Today)
    // Only send if status is PENDING or REJECTED
    // ==========================================
    const reminders = await client.query(`
      SELECT
        cd.id as doc_id, cd.document_name, cd.due_date,
        c.email as client_email, c.name as client_name,
        (cd.due_date - current_date) as days_left
      FROM client_documents cd
      JOIN client_audits ca ON ca.id = cd.client_audit_id
      JOIN clients c ON c.id = ca.client_id
      WHERE cd.status IN ('pending', 'rejected')
      AND cd.due_date IS NOT NULL
      AND (
        cd.due_date = current_date + interval '5 days' OR
        cd.due_date = current_date + interval '1 day' OR
        cd.due_date = current_date
      )
    `);

    for (const row of reminders.rows) {
      let urgency = "Upcoming";
      if (row.days_left === 1) urgency = "Tomorrow";
      if (row.days_left === 0) urgency = "TODAY";

      await sendEmail({
        to: row.client_email,
        subject: `📅 Reminder: Document Due ${urgency} (${row.document_name})`,
        html: `
          <p>Dear ${row.client_name},</p>
          <p>This is a reminder to upload: <b>${row.document_name}</b>.</p>
          <p>Due Date: <b>${new Date(row.due_date).toDateString()}</b></p>
          <p>Please upload it via your portal to avoid delays.</p>
        `
      });
    }

    // ==========================================
    // 2. MISSED DEADLINE (Notify Firm)
    // Only send if status is PENDING and date passed
    // ==========================================
    const missed = await client.query(`
      SELECT
        cd.id as doc_id, cd.document_name, cd.due_date,
        f.email as firm_email, f.name as firm_name,
        c.name as client_name
      FROM client_documents cd
      JOIN client_audits ca ON ca.id = cd.client_audit_id
      JOIN clients c ON c.id = ca.client_id
      JOIN firms f ON f.id = ca.firm_id
      WHERE cd.status IN ('pending', 'rejected')
      AND cd.due_date < current_date
      -- Prevent spamming: Only send on the 1st day missed
      AND cd.due_date = current_date - interval '1 day'
    `);

    for (const row of missed.rows) {
      await sendEmail({
        to: row.firm_email,
        subject: `⚠️ Missed Deadline: ${row.client_name}`,
        html: `
          <p>Hello ${row.firm_name},</p>
          <p>Client <b>${row.client_name}</b> has missed the deadline for:</p>
          <p><b>${row.document_name}</b> (Due: ${new Date(row.due_date).toDateString()})</p>
          <p>Please follow up with the client.</p>
        `
      });
    }

    console.log(`✅ Scheduler finished. Sent ${reminders.rows.length} reminders and ${missed.rows.length} alerts.`);

  } catch (err) {
    console.error("Scheduler Error:", err);
  } finally {
    client.release();
  }
});