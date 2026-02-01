const cron = require("node-cron");
const pool = require("../db");
const { sendEmail } = require("../utils/mailer");
const { clientReminder } = require("./clientReminder");

cron.schedule("0 9 * * *", async () => {
  const client = await pool.connect();

  try {
    const res = await client.query(`
      select
        cd.id as document_id,
        cd.document_name,
        cd.due_date,
        c.email as client_email,
        c.name as client_name
      from client_documents cd
      join client_audits ca on ca.id = cd.client_audit_id
      join clients c on c.id = ca.client_id
      where cd.status = 'pending'
        and cd.due_date in (
          current_date + interval '5 days',
          current_date + interval '1 day',
          current_date
        )
    `);

    for (const row of res.rows) {
      const exists = await client.query(`
        select 1 from email_logs
        where email_type = 'DUE_REMINDER'
          and document_id = $1
          and recipient_email = $2
      `, [row.document_id, row.client_email]);

      if (exists.rows.length) continue;

      await sendEmail({
        to: row.client_email,
        subject: "Document Due Reminder",
        html: clientReminder({
          name: row.client_name,
          docName: row.document_name,
          dueDate: row.due_date
        })
      });

      await client.query(`
        insert into email_logs(email_type, document_id, recipient_email)
        values ('DUE_REMINDER', $1, $2)
      `, [row.document_id, row.client_email]);
    }

  } catch (err) {
    console.error("Email Cron Error:", err);
  } finally {
    client.release();
  }
});
