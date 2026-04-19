const pool = require('../db');
const { generateOTP } = require('../utils/otp');
const { sendOtpEmail } = require('./emailService'); 

// Function to check for new document uploads (every 2 hours)
async function checkDocumentUploads() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get last run time
    const metaResult = await client.query(
      'SELECT last_run FROM scheduler_meta WHERE key = $1',
      ['document_upload_check']
    );
    let lastRun = metaResult.rows[0]?.last_run;
    if (!lastRun) {
      // If no record, set it to 2 hours ago
      lastRun = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await client.query(
        'INSERT INTO scheduler_meta (key, last_run) VALUES ($1, $2)',
        ['document_upload_check', lastRun]
      );
    }

    // Count uploads after last run
    const uploadCountResult = await client.query(
      `SELECT COUNT(*) 
       FROM dox 
       WHERE medical_uploaded_at > $1 
          OR police_uploaded_at > $1`,
      [lastRun]
    );
    const count = parseInt(uploadCountResult.rows[0].count, 10);

    if (count > 0) {
      // Insert notification
      const message = `${count} candidate(s) uploaded documents in the last 2 hours.`;
      await client.query(
        'INSERT INTO notifications (message, type) VALUES ($1, $2)',
        [message, 'document_upload']
      );
      console.log(`Notification created: ${count} new uploads`);
    }

    // Update last run time to now
    await client.query(
      'UPDATE scheduler_meta SET last_run = NOW() WHERE key = $1',
      ['document_upload_check']
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in checkDocumentUploads:', err);
  } finally {
    client.release();
  }
}

// Function to refresh expired OTPs (daily)
async function refreshExpiredOtps() {
  const client = await pool.connect();
  try {
    // Find users with expired OTP (new = true and valid_until < NOW())
    const expiredUsers = await client.query(
      `SELECT fl.user_id, u.email, u.first_name, u.last_name
       FROM first_login fl
       JOIN users u ON fl.user_id = u.employee_id
       WHERE fl.new = true AND fl.valid_until < NOW()`
    );

    for (const user of expiredUsers.rows) {
      const newOtp = generateOTP();
      const newValidUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update first_login with new OTP and expiry
      await client.query(
        `UPDATE first_login
         SET otp = $1, valid_until = $2, updated_at = NOW()
         WHERE user_id = $3`,
        [newOtp, newValidUntil, user.user_id]
      );

      // Send new OTP email (non‑blocking)
      sendOtpEmail(user.email, user.first_name, user.last_name, newOtp).catch(err => {
        console.error(`Failed to resend OTP to ${user.email}:`, err);
      });
    }

    if (expiredUsers.rows.length > 0) {
      console.log(`Refreshed OTP for ${expiredUsers.rows.length} user(s)`);
    }
  } catch (err) {
    console.error('Error in refreshExpiredOtps:', err);
  } finally {
    client.release();
  }
}

module.exports = { checkDocumentUploads, refreshExpiredOtps };