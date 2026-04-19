const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { generateOTP } = require('../utils/otp');
const { sendOtpEmail, sendEmailWithTemplate } = require('../services/emailService');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

const upload = multer({ storage: multer.memoryStorage() });

// ----------------------------------------------------------------------
// CSV Upload Endpoint (fully implemented)
// ----------------------------------------------------------------------
router.post('/candidates/upload',
  verifyToken,
  requireRole('recruiter'),
  upload.single('csv'),
  async (req, res, next) => {
    // No file uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const rows = [];
    const stream = Readable.from(req.file.buffer.toString());

    // Parse CSV
    stream
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        if (rows.length === 0) {
          return res.status(400).json({ error: 'CSV file is empty' });
        }

        // Validate each row
        for (const [index, row] of rows.entries()) {
          // Required fields: first_name, last_name, email
          if (!row.first_name || !row.last_name || !row.email) {
            return res.status(400).json({
              error: `Row ${index + 1}: missing required field (first_name, last_name, email)`,
            });
          }

          // Role validation (optional, defaults to 'candidate')
          const role = row.role ? row.role.toLowerCase() : 'candidate';
          if (!['candidate', 'recruiter'].includes(role)) {
            return res.status(400).json({
              error: `Row ${index + 1}: invalid role. Must be 'candidate' or 'recruiter'.`,
            });
          }

          // Email format
          const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
          if (!emailRegex.test(row.email)) {
            return res.status(400).json({
              error: `Row ${index + 1}: invalid email format`,
            });
          }

          // Batch validation based on role
          if (role === 'candidate') {
            if (!row.batch) {
              return res.status(400).json({
                error: `Row ${index + 1}: batch is required for candidates`,
              });
            }
            const batchNum = parseInt(row.batch, 10);
            if (isNaN(batchNum) || batchNum < 1900 || batchNum > 2100) {
              return res.status(400).json({
                error: `Row ${index + 1}: batch must be a 4-digit year between 1900 and 2100`,
              });
            }
            // store batch as integer
            row.batchNum = batchNum;
          } else {
            // recruiter: batch must be omitted or empty; set to NULL
            row.batchNum = null;
          }

          // Phone optional – no strict validation; just store as string
        }

        const client = await pool.connect();
        const createdRecords = [];

        try {
          await client.query('BEGIN');

          for (const row of rows) {
            const role = row.role ? row.role.toLowerCase() : 'candidate';

            // Insert into users
            const insertUserQuery = `
              INSERT INTO users (first_name, last_name, email, ph_no, batch, role, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING employee_id
            `;
            const userResult = await client.query(insertUserQuery, [
              row.first_name,
              row.last_name,
              row.email,
              row.ph_no || null,
              row.batchNum,
              role,
              1, // active status
            ]);
            const employee_id = userResult.rows[0].employee_id;

            // Insert into first_login
            const otp = generateOTP();
            const valid_until = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
            await client.query(
              `INSERT INTO first_login (user_id, otp, valid_until, new)
               VALUES ($1, $2, $3, $4)`,
              [employee_id, otp, valid_until, true]
            );

            // Insert into dox only for candidates
            if (role === 'candidate') {
              await client.query(
                `INSERT INTO dox (user_id) VALUES ($1)`,
                [employee_id]
              );
            }

            createdRecords.push({
              employee_id,
              email: row.email,
              otp,
              role,
            });
          }

          await client.query('COMMIT');

          // Send emails asynchronously after commit (fire and forget)
          for (const record of createdRecords) {
            sendOtpEmail(record.email, record.first_name || 'User', record.last_name || '', record.otp).catch((err) => {
              console.error(`Failed to send OTP to ${record.email}:`, err);
            });
          }

          // Return success (OTPs only in development)
          res.status(201).json({
            message: `${createdRecords.length} user(s) created successfully`,
            users:
              process.env.NODE_ENV === 'development'
                ? createdRecords.map(({ employee_id, email, otp, role }) => ({
                    employee_id,
                    email,
                    otp,
                    role,
                  }))
                : undefined,
          });
        } catch (err) {
          await client.query('ROLLBACK');
          // Handle duplicate key errors
          if (err.code === '23505') {
            if (err.constraint === 'users_email_key') {
              return res.status(409).json({
                error:
                  'Duplicate email found in upload. Please ensure emails are unique.',
              });
            }
            if (err.constraint === 'users_ph_no_key') {
              return res.status(409).json({
                error:
                  'Duplicate phone number found in upload. Please ensure phone numbers are unique.',
              });
            }
          }
          console.error('CSV import error:', err);
          res.status(500).json({ error: 'Failed to import CSV' });
        } finally {
          client.release();
        }
      })
      .on('error', (err) => {
        console.error('CSV parsing error:', err);
        res.status(400).json({ error: 'Invalid CSV format' });
      });
  }
);

// ----------------------------------------------------------------------
// All other endpoints (unchanged)
// ----------------------------------------------------------------------

// PATCH /api/recruiter/candidates/:employee_id/documents/medical/permission
router.patch('/candidates/:employee_id/documents/medical/permission',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { employee_id } = req.params;
    const { allowed } = req.body;
    if (typeof allowed !== 'boolean') {
      return res.status(400).json({ error: 'allowed must be a boolean' });
    }
    try {
      const result = await pool.query(
        `UPDATE dox SET medical_upload_allowed = $1 WHERE user_id = $2 RETURNING user_id`,
        [allowed, employee_id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json({ message: `Medical upload permission set to ${allowed}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/recruiter/candidates/:employee_id/documents/police/permission
router.patch('/candidates/:employee_id/documents/police/permission',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { employee_id } = req.params;
    const { allowed } = req.body;
    if (typeof allowed !== 'boolean') {
      return res.status(400).json({ error: 'allowed must be a boolean' });
    }
    try {
      const result = await pool.query(
        `UPDATE dox SET police_upload_allowed = $1 WHERE user_id = $2 RETURNING user_id`,
        [allowed, employee_id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json({ message: `Police upload permission set to ${allowed}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/recruiter/candidates/:employee_id/documents
router.get('/candidates/:employee_id/documents',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { employee_id } = req.params;
    try {
      const result = await pool.query(
        `SELECT 
          medical_status, medical_reason, medical_file_path, medical_original_filename, medical_uploaded_at, medical_upload_allowed,
          police_status, police_reason, police_file_path, police_original_filename, police_uploaded_at, police_upload_allowed,
          final_status, final_reason,
          joining_status, joining_reason
         FROM dox WHERE user_id = $1`,
        [employee_id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/recruiter/candidates/:employee_id/documents/medical
router.patch('/candidates/:employee_id/documents/medical',
  verifyToken,
  requireRole('recruiter'),
  [
    body('status').isIn(['pending', 'completed', 'rejected']).withMessage('Invalid status'),
    body('reason').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { employee_id } = req.params;
    const { status, reason } = req.body;
    try {
      const result = await pool.query(
        `UPDATE dox 
         SET medical_status = $1, 
             medical_reason = $2,
             updated_at = NOW()
         WHERE user_id = $3
         RETURNING user_id`,
        [status, reason || null, employee_id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json({ message: 'Medical document updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/recruiter/candidates/:employee_id/documents/police
router.patch('/candidates/:employee_id/documents/police',
  verifyToken,
  requireRole('recruiter'),
  [
    body('status').isIn(['pending', 'completed', 'rejected']).withMessage('Invalid status'),
    body('reason').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { employee_id } = req.params;
    const { status, reason } = req.body;
    try {
      const result = await pool.query(
        `UPDATE dox 
         SET police_status = $1, 
             police_reason = $2,
             updated_at = NOW()
         WHERE user_id = $3
         RETURNING user_id`,
        [status, reason || null, employee_id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json({ message: 'Police document updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/recruiter/candidates/:employee_id/final-clearance
router.patch('/candidates/:employee_id/final-clearance',
  verifyToken,
  requireRole('recruiter'),
  [
    body('status').isIn(['pending', 'completed', 'rejected']).withMessage('Invalid status'),
    body('reason').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { employee_id } = req.params;
    const { status, reason } = req.body;
    try {
      const result = await pool.query(
        `UPDATE dox 
         SET final_status = $1, 
             final_reason = $2,
             updated_at = NOW()
         WHERE user_id = $3
         RETURNING user_id`,
        [status, reason || null, employee_id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json({ message: 'Final clearance status updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/recruiter/candidates/:employee_id/joining-letter
router.patch('/candidates/:employee_id/joining-letter',
  verifyToken,
  requireRole('recruiter'),
  [
    body('status').isIn(['pending', 'completed', 'rejected']).withMessage('Invalid status'),
    body('reason').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { employee_id } = req.params;
    const { status, reason } = req.body;
    try {
      const result = await pool.query(
        `UPDATE dox 
         SET joining_status = $1, 
             joining_reason = $2,
             updated_at = NOW()
         WHERE user_id = $3
         RETURNING user_id`,
        [status, reason || null, employee_id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json({ message: 'Joining letter status updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/recruiter/notifications
router.get('/notifications',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, message, type, created_at FROM notifications ORDER BY created_at DESC LIMIT 50'
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/recruiter/candidates/:employee_id/resend-otp
router.post('/candidates/:employee_id/resend-otp',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { employee_id } = req.params;
    try {
      const userResult = await pool.query(
        `SELECT u.email, u.first_name, u.last_name, fl.new
         FROM users u
         JOIN first_login fl ON u.employee_id = fl.user_id
         WHERE u.employee_id = $1`,
        [employee_id]
      );
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const { email, first_name, last_name, new: isNew } = userResult.rows[0];
      if (!isNew) {
        return res.status(400).json({ error: 'Password already set' });
      }

      const newOtp = generateOTP();
      const newValidUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await pool.query(
        `UPDATE first_login
         SET otp = $1, valid_until = $2, updated_at = NOW()
         WHERE user_id = $3`,
        [newOtp, newValidUntil, employee_id]
      );

      await sendOtpEmail(email, first_name, last_name, newOtp);
      res.json({ message: 'OTP resent successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ----------------------------------------------------------------------
// Email Template Management
// ----------------------------------------------------------------------

// GET /api/recruiter/templates
router.get('/templates',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, name, subject, body, created_at, updated_at FROM templates ORDER BY created_at DESC'
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/recruiter/templates/:id
router.get('/templates/:id',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        'SELECT id, name, subject, body, created_at, updated_at FROM templates WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/recruiter/templates
router.post('/templates',
  verifyToken,
  requireRole('recruiter'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('body').notEmpty().withMessage('Body is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, subject, body } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO templates (name, subject, body) VALUES ($1, $2, $3) RETURNING id`,
        [name, subject, body]
      );
      res.status(201).json({ id: result.rows[0].id, message: 'Template created successfully' });
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Template name already exists' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/recruiter/templates/:id
router.put('/templates/:id',
  verifyToken,
  requireRole('recruiter'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('body').notEmpty().withMessage('Body is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;
    const { name, subject, body } = req.body;
    try {
      const result = await pool.query(
        `UPDATE templates SET name = $1, subject = $2, body = $3, updated_at = NOW() WHERE id = $4 RETURNING id`,
        [name, subject, body, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json({ message: 'Template updated successfully' });
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Template name already exists' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/recruiter/templates/:id
router.delete('/templates/:id',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM templates WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json({ message: 'Template deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ----------------------------------------------------------------------
// Bulk Email Sending
// ----------------------------------------------------------------------

// POST /api/recruiter/emails/bulk
router.post('/emails/bulk',
  verifyToken,
  requireRole('recruiter'),
  [
    body('templateId').isInt().withMessage('Valid template ID required'),
    body('filters').optional().isObject(),
    body('recipientIds').optional().isArray(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { templateId, filters = {}, recipientIds = [] } = req.body;

    // Fetch recipients
    let usersResult;
    if (recipientIds && recipientIds.length > 0) {
      const ids = recipientIds.map(id => parseInt(id));
      usersResult = await pool.query(
        `SELECT employee_id, email, first_name, last_name FROM users WHERE employee_id = ANY($1) AND role IN ('candidate', 'recruiter')`,
        [ids]
      );
      if (usersResult.rows.length === 0) {
        return res.status(404).json({ error: 'No valid recipients found' });
      }
    } else {
      // Build dynamic WHERE clause for filters
      const conditions = [];
      const values = [];
      let paramCounter = 1;

      const allowedFilters = {
        role: 'u.role',
        batch: 'u.batch',
        status: 'u.status',
        medical_status: 'd.medical_status',
        police_status: 'd.police_status',
        final_status: 'd.final_status',
        joining_status: 'd.joining_status',
      };

      for (const [key, column] of Object.entries(allowedFilters)) {
        if (filters[key] !== undefined) {
          conditions.push(`${column} = $${paramCounter}`);
          values.push(filters[key]);
          paramCounter++;
        }
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const usersQuery = `
        SELECT u.employee_id, u.email, u.first_name, u.last_name
        FROM users u
        LEFT JOIN dox d ON u.employee_id = d.user_id
        ${whereClause}
        AND u.role IN ('candidate', 'recruiter')
      `;
      usersResult = await pool.query(usersQuery, values);
      if (usersResult.rows.length === 0) {
        return res.status(404).json({ error: 'No users match the given filters' });
      }
    }

    const recipients = usersResult.rows;

    // Send emails synchronously and collect results
    const successes = [];
    const failures = [];

    for (const user of recipients) {
      try {
        await sendEmailWithTemplate({
          to: user.email,
          templateId: parseInt(templateId, 10),
          placeholders: {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            employee_id: user.employee_id,
          },
        });
        successes.push(user.email);
      } catch (err) {
        failures.push({ email: user.email, error: err.message });
      }
    }

    // Build notification message
    let notificationMessage = '';
    if (successes.length === recipients.length) {
      notificationMessage = `Bulk email sent successfully to ${successes.length} recipient(s).`;
    } else {
      const uniqueErrors = [...new Map(failures.map(f => [f.error, f])).values()];
      const errorDetails = uniqueErrors.map(e => `"${e.error}" (${failures.filter(f => f.error === e.error).length} times)`).join('; ');
      notificationMessage = `Bulk email sent to ${successes.length} of ${recipients.length} recipient(s). Errors: ${errorDetails}`;
    }

    // Insert notification
    await pool.query(
      `INSERT INTO notifications (message, type, created_at) VALUES ($1, 'bulk_email', NOW())`,
      [notificationMessage]
    );

    res.json({
      message: `Bulk email processed. Sent to ${successes.length} of ${recipients.length} user(s).`,
      successCount: successes.length,
      failureCount: failures.length,
      errors: process.env.NODE_ENV === 'development' ? failures : undefined,
    });
  }
);

// ----------------------------------------------------------------------
// User Management (for recruiters)
// ----------------------------------------------------------------------

// GET /api/recruiter/users - list users with filters
// GET /api/recruiter/users - list users with filters (including dox statuses)
router.get('/users',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const {
      role, batch, status, search,
      medical_status, police_status, final_status, joining_status,
      page = 1, limit = 20
    } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let paramCounter = 1;

    // User fields
    if (role && ['candidate', 'recruiter'].includes(role)) {
      conditions.push(`u.role = $${paramCounter++}`);
      values.push(role);
    }
    if (batch) {
      const batchNum = parseInt(batch, 10);
      if (!isNaN(batchNum)) {
        conditions.push(`u.batch = $${paramCounter++}`);
        values.push(batchNum);
      }
    }
    if (status !== undefined) {
      const statusNum = parseInt(status, 10);
      if (!isNaN(statusNum) && [0, 1].includes(statusNum)) {
        conditions.push(`u.status = $${paramCounter++}`);
        values.push(statusNum);
      }
    }
    if (search) {
      conditions.push(`(u.first_name ILIKE $${paramCounter++} OR u.last_name ILIKE $${paramCounter++} OR u.email ILIKE $${paramCounter++})`);
      const searchTerm = `%${search}%`;
      values.push(searchTerm, searchTerm, searchTerm);
    }

    // Dox status filters
    const allowedDoxStatuses = ['pending', 'completed', 'rejected'];
    if (medical_status && allowedDoxStatuses.includes(medical_status)) {
      conditions.push(`d.medical_status = $${paramCounter++}`);
      values.push(medical_status);
    }
    if (police_status && allowedDoxStatuses.includes(police_status)) {
      conditions.push(`d.police_status = $${paramCounter++}`);
      values.push(police_status);
    }
    if (final_status && allowedDoxStatuses.includes(final_status)) {
      conditions.push(`d.final_status = $${paramCounter++}`);
      values.push(final_status);
    }
    if (joining_status && allowedDoxStatuses.includes(joining_status)) {
      conditions.push(`d.joining_status = $${paramCounter++}`);
      values.push(joining_status);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*)
      FROM users u
      LEFT JOIN dox d ON u.employee_id = d.user_id
      ${whereClause}
    `;
    const dataQuery = `
      SELECT u.employee_id, u.first_name, u.last_name, u.email, u.ph_no, u.batch, u.role, u.status, u.created_at,
             d.medical_status, d.police_status, d.final_status, d.joining_status,
             d.medical_file_path, d.medical_original_filename, d.medical_upload_allowed,
             d.police_file_path, d.police_original_filename, d.police_upload_allowed,
             fl.new AS first_login_pending
      FROM users u
      LEFT JOIN dox d ON u.employee_id = d.user_id
      LEFT JOIN first_login fl ON u.employee_id = fl.user_id
      ${whereClause}
      ORDER BY u.employee_id DESC
      LIMIT $${paramCounter++} OFFSET $${paramCounter++}
    `;

    try {
      const countResult = await pool.query(countQuery, values.slice(0, paramCounter - 2));
      const total = parseInt(countResult.rows[0].count, 10);

      const dataValues = [...values, limit, offset];
      const dataResult = await pool.query(dataQuery, dataValues);

      res.json({
        users: dataResult.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/recruiter/users/:employee_id - get single user with full details (including dox and first_login)
router.get('/users/:employee_id',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { employee_id } = req.params;
    try {
      // Get user basic info
      const userResult = await pool.query(
        `SELECT employee_id, first_name, last_name, email, ph_no, batch, role, status, created_at, updated_at
         FROM users WHERE employee_id = $1`,
        [employee_id]
      );
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = userResult.rows[0];

      // Get first_login info (if exists)
      const flResult = await pool.query(
        `SELECT new, otp IS NOT NULL AND valid_until > NOW() AS otp_valid, valid_until
         FROM first_login WHERE user_id = $1`,
        [employee_id]
      );
      user.first_login = flResult.rows[0] || null;

      // Get dox info for candidates
      if (user.role === 'candidate') {
        const doxResult = await pool.query(
          `SELECT medical_status, medical_reason, medical_uploaded_at, medical_upload_allowed,
                  police_status, police_reason, police_uploaded_at, police_upload_allowed,
                  final_status, final_reason,
                  joining_status, joining_reason
           FROM dox WHERE user_id = $1`,
          [employee_id]
        );
        user.dox = doxResult.rows[0] || null;
      }

      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/recruiter/users/:employee_id - update user profile
router.patch('/users/:employee_id',
  verifyToken,
  requireRole('recruiter'),
  [
    body('first_name').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
    body('last_name').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('ph_no').optional().trim(),
    body('batch').optional().custom(value => {
      if (value === '' || value === null || value === undefined) return true;
      const num = Number(value);
      if (isNaN(num) || num < 1900 || num > 2100) throw new Error('Batch must be a 4-digit year between 1900 and 2100');
      return true;
    }),
    body('role').optional().isIn(['candidate', 'recruiter']).withMessage('Invalid role'),
    body('status').optional().isIn([0, 1]).withMessage('Status must be 0 or 1'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employee_id } = req.params;
    const updates = [];
    const values = [];
    let paramCounter = 1;

    const allowedFields = ['first_name', 'last_name', 'email', 'ph_no', 'role', 'status'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCounter++}`);
        values.push(req.body[field]);
      }
    }

    // Handle batch separately: convert empty string to null
    if (req.body.batch !== undefined) {
      let batchValue = req.body.batch;
      if (batchValue === '' || batchValue === null || batchValue === undefined) {
        batchValue = null;
      } else {
        batchValue = parseInt(batchValue, 10);
      }
      updates.push(`batch = $${paramCounter++}`);
      values.push(batchValue);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(employee_id);
    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE employee_id = $${paramCounter}
      RETURNING employee_id, first_name, last_name, email, ph_no, batch, role, status
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User updated successfully', user: result.rows[0] });
    } catch (err) {
      console.error('Error updating user:', err);
      if (err.code === '23505') {
        if (err.constraint === 'users_email_key') {
          return res.status(409).json({ error: 'Email already exists' });
        }
        if (err.constraint === 'users_ph_no_key') {
          return res.status(409).json({ error: 'Phone number already exists' });
        }
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ----------------------------------------------------------------------
// Hospital List Management
// ----------------------------------------------------------------------

// GET /api/recruiter/hospitals - list hospitals with search & pagination
router.get('/hospitals',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let paramCounter = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramCounter} OR address ILIKE $${paramCounter})`);
      values.push(`%${search}%`);
      paramCounter++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) FROM hosp_list
      ${whereClause}
    `;
    const dataQuery = `
      SELECT id, name, address
      FROM hosp_list
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${paramCounter++} OFFSET $${paramCounter++}
    `;

    try {
      const countResult = await pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count, 10);

      const dataValues = [...values, limit, offset];
      const dataResult = await pool.query(dataQuery, dataValues);

      res.json({
        hospitals: dataResult.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/recruiter/hospitals/:id - get single hospital by id
router.get('/hospitals/:id',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        'SELECT id, name, address FROM hosp_list WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Hospital not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/recruiter/hospitals - create a single hospital
router.post('/hospitals',
  verifyToken,
  requireRole('recruiter'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('address').notEmpty().withMessage('Address is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, address } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO hosp_list (name, address) VALUES ($1, $2) RETURNING id, name, address',
        [name, address]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Address already exists' });
      }
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/recruiter/hospitals/:id - update a hospital
router.put('/hospitals/:id',
  verifyToken,
  requireRole('recruiter'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('address').notEmpty().withMessage('Address is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;
    const { name, address } = req.body;
    try {
      const result = await pool.query(
        `UPDATE hosp_list SET name = $1, address = $2 WHERE id = $3 RETURNING id, name, address`,
        [name, address, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Hospital not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Address already exists' });
      }
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/recruiter/hospitals/:id - delete a hospital
router.delete('/hospitals/:id',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM hosp_list WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Hospital not found' });
      }
      res.json({ message: 'Hospital deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/recruiter/hospitals/upload - bulk upload hospitals via CSV
router.post('/hospitals/upload',
  verifyToken,
  requireRole('recruiter'),
  upload.single('csv'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const rows = [];
    const stream = Readable.from(req.file.buffer.toString());

    // Parse CSV
    stream
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        if (rows.length === 0) {
          return res.status(400).json({ error: 'CSV file is empty' });
        }

        // Validate each row
        for (const [index, row] of rows.entries()) {
          if (!row.name || !row.address) {
            return res.status(400).json({
              error: `Row ${index + 1}: missing required fields (name, address)`,
            });
          }
        }

        const client = await pool.connect();
        const inserted = [];
        const duplicates = [];

        try {
          await client.query('BEGIN');

          for (const row of rows) {
            try {
              const result = await client.query(
                `INSERT INTO hosp_list (name, address) VALUES ($1, $2) RETURNING id, name, address`,
                [row.name, row.address]
              );
              inserted.push(result.rows[0]);
            } catch (err) {
              if (err.code === '23505') {
                duplicates.push({ name: row.name, address: row.address });
                // continue with next row, do not rollback
              } else {
                throw err; // rollback for other errors
              }
            }
          }

          await client.query('COMMIT');

          res.status(201).json({
            message: `${inserted.length} hospital(s) inserted, ${duplicates.length} duplicate(s) skipped.`,
            inserted,
            duplicates: process.env.NODE_ENV === 'development' ? duplicates : undefined,
          });
        } catch (err) {
          await client.query('ROLLBACK');
          console.error('CSV import error:', err);
          res.status(500).json({ error: 'Failed to import CSV' });
        } finally {
          client.release();
        }
      })
      .on('error', (err) => {
        console.error('CSV parsing error:', err);
        res.status(400).json({ error: 'Invalid CSV format' });
      });
  }
);


// ----------------------------------------------------------------------
// Dashboard Statistics
// ----------------------------------------------------------------------
router.get('/dashboard/stats',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    try {
      // 1. Batch‑wise counts
      const batchStatsQuery = `
        SELECT 
          u.batch,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE d.medical_status = 'pending') as medical_pending,
          COUNT(*) FILTER (WHERE d.medical_status = 'completed') as medical_completed,
          COUNT(*) FILTER (WHERE d.police_status = 'pending') as police_pending,
          COUNT(*) FILTER (WHERE d.police_status = 'completed') as police_completed,
          COUNT(*) FILTER (WHERE d.final_status = 'pending') as final_pending,
          COUNT(*) FILTER (WHERE d.final_status = 'completed') as final_completed,
          COUNT(*) FILTER (WHERE d.joining_status = 'pending') as joining_pending,
          COUNT(*) FILTER (WHERE d.joining_status = 'completed') as joining_completed
        FROM users u
        LEFT JOIN dox d ON u.employee_id = d.user_id
        WHERE u.role = 'candidate'
        GROUP BY u.batch
        ORDER BY u.batch DESC
      `;
      const batchStatsResult = await pool.query(batchStatsQuery);
      const batchStats = batchStatsResult.rows.map(row => ({
        batch: row.batch,
        total: parseInt(row.total),
        medical: { pending: parseInt(row.medical_pending), completed: parseInt(row.medical_completed) },
        police: { pending: parseInt(row.police_pending), completed: parseInt(row.police_completed) },
        final: { pending: parseInt(row.final_pending), completed: parseInt(row.final_completed) },
        joining: { pending: parseInt(row.joining_pending), completed: parseInt(row.joining_completed) }
      }));

      // 2. Recent 3 candidates
      const recentCandidatesQuery = `
        SELECT 
          u.employee_id, u.first_name, u.last_name, u.email,
          d.medical_status, d.police_status, d.final_status, d.joining_status
        FROM users u
        LEFT JOIN dox d ON u.employee_id = d.user_id
        WHERE u.role = 'candidate'
        ORDER BY u.employee_id DESC
        LIMIT 3
      `;
      const recentResult = await pool.query(recentCandidatesQuery);
      const recentCandidates = recentResult.rows.map(row => {
        let currentStage = null;
        if (row.medical_status !== 'completed') currentStage = 'medical';
        else if (row.police_status !== 'completed') currentStage = 'police';
        else if (row.final_status !== 'completed') currentStage = 'final';
        else if (row.joining_status !== 'completed') currentStage = 'joining';
        else currentStage = 'completed';
        return {
          employee_id: row.employee_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          currentStage
        };
      });

      res.json({ batchStats, recentCandidates });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/recruiter/candidates/:employee_id/documents/:type
router.get('/candidates/:employee_id/documents/:type',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { employee_id, type } = req.params;
    if (!['medical', 'police'].includes(type)) {
      return res.status(400).json({ error: 'Invalid document type. Use "medical" or "police".' });
    }

    try {
      const column = type === 'medical' ? 'medical_file_path' : 'police_file_path';
      const result = await pool.query(
        `SELECT ${column} FROM dox WHERE user_id = $1`,
        [employee_id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      const filePath = result.rows[0][column];
      if (!filePath) {
        return res.status(404).json({ error: `No ${type} document found for this candidate` });
      }

      // Check if file exists on disk
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      // Send file
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).json({ error: 'Error sending file' });
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/recruiter/candidates/:employee_id/reset-password
router.post('/candidates/:employee_id/reset-password',
  verifyToken,
  requireRole('recruiter'),
  async (req, res) => {
    const { employee_id } = req.params;
    try {
      // Check if user exists and is a candidate
      const userResult = await pool.query(
        'SELECT role FROM users WHERE employee_id = $1',
        [employee_id]
      );
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (userResult.rows[0].role !== 'candidate') {
        return res.status(400).json({ error: 'Only candidates can reset password' });
      }

      // Delete any existing auth record
      await pool.query('DELETE FROM auth WHERE user_id = $1', [employee_id]);

      // Update first_login: set new = true, generate new OTP and expiry
      const newOtp = generateOTP();
      const newValidUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await pool.query(
        `UPDATE first_login
         SET new = true,
             otp = $1,
             valid_until = $2,
             updated_at = NOW()
         WHERE user_id = $3`,
        [newOtp, newValidUntil, employee_id]
      );

      // Get user email and name for email sending
      const userInfo = await pool.query(
        'SELECT email, first_name, last_name FROM users WHERE employee_id = $1',
        [employee_id]
      );
      const { email, first_name, last_name } = userInfo.rows[0];

      // Send OTP email
      await sendOtpEmail(email, first_name, last_name, newOtp);

      res.json({ message: 'Password reset initiated. New OTP sent to candidate.' });
    } catch (err) {
      console.error('Error resetting password:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;