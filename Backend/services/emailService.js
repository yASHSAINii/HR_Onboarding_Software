const FormData = require('form-data');
const Mailgun = require('mailgun.js');
const pool = require('../db');

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});
const DOMAIN = process.env.MAILGUN_DOMAIN;
const FROM_EMAIL = process.env.EMAIL_FROM || `postmaster@${DOMAIN}`;

/*
 Replace placeholders like {{key}} with actual values
 */
function replacePlaceholders(str, placeholders) {
  let result = str;
  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/*
 Fetch template by ID or name
 */
async function getTemplate(identifier) {
  let query, params;
  if (typeof identifier === 'number' || !isNaN(parseInt(identifier, 10))) {
    query = 'SELECT id, subject, body FROM templates WHERE id = $1';
    params = [parseInt(identifier, 10)];
  } else {
    query = 'SELECT id, subject, body FROM templates WHERE name = $1';
    params = [identifier];
  }
  const result = await pool.query(query, params);
  if (result.rows.length === 0) {
    throw new Error(`Template not found: ${identifier}`);
  }
  return result.rows[0];
}

/*
 Send email using a template
 */
async function sendEmailWithTemplate({ to, templateId, placeholders = {}, subjectOverride }) {
  const template = await getTemplate(templateId);
  let subject = subjectOverride || template.subject;
  let body = template.body;

  // Replace placeholders
  subject = replacePlaceholders(subject, placeholders);
  body = replacePlaceholders(body, placeholders);

  try {
    const data = await mg.messages.create(DOMAIN, {
      from: FROM_EMAIL,
      to: [to],
      subject: subject,
      html: body,               
    });

    // Log success
    await pool.query(
      `INSERT INTO email_logs (template_id, recipient_email, subject, status, sent_at)
       VALUES ($1, $2, $3, 'sent', NOW())`,
      [template.id, to, subject]
    );
    return data;
  } catch (error) {
    // Log failure
    await pool.query(
      `INSERT INTO email_logs (template_id, recipient_email, subject, status, error_message, sent_at)
       VALUES ($1, $2, $3, 'failed', $4, NOW())`,
      [template.id, to, subject, error.message]
    );
    throw error;
  }
}

/**
 Send OTP email (first login)
 */
async function sendOtpEmail(to, firstName, lastName, otp) {
  return sendEmailWithTemplate({
    to,
    templateId: 'welcome_otp',
    placeholders: {
      first_name: firstName,
      last_name: lastName,
      otp: otp,
      app_name: process.env.APP_NAME || 'DayZero',
    },
  });
}

/*
 Send password reset email
 */
async function sendPasswordResetEmail(to, firstName, otp) {
  return sendEmailWithTemplate({
    to,
    templateId: 'password_reset',
    placeholders: {
      first_name: firstName,
      otp,
      app_name: process.env.APP_NAME || 'DayZero',
    },
  });
}

module.exports = {
  sendEmailWithTemplate,
  sendOtpEmail,
  sendPasswordResetEmail,
};