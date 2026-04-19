const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

// multer for file uploads---------------
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, PNG, DOC, DOCX are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter
});

// All candidate routes require authentication and candidate role
router.use(verifyToken);
router.use(requireRole('candidate'));

// GET /api/candidates/documents
router.get('/documents', async (req, res) => {
  const userId = req.user.employee_id;
  try {
    const result = await pool.query(
      `SELECT 
        medical_status, medical_reason, medical_file_path, medical_original_filename, medical_uploaded_at, medical_upload_allowed,
        police_status, police_reason, police_file_path, police_original_filename, police_uploaded_at, police_upload_allowed,
        final_status, final_reason,
        joining_status, joining_reason
       FROM dox WHERE user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/candidates/documents/medical
router.post('/documents/medical', upload.single('file'), async (req, res) => {
  const userId = req.user.employee_id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const doxResult = await pool.query(
      'SELECT medical_upload_allowed, medical_file_path FROM dox WHERE user_id = $1',
      [userId]
    );
    if (doxResult.rows.length === 0) {
      return res.status(404).json({ error: 'User document record not found' });
    }
    const { medical_upload_allowed, medical_file_path } = doxResult.rows[0];

    if (medical_file_path) {
      return res.status(403).json({ error: 'Medical document already uploaded. Contact recruiter if you need to re-upload.' });
    }
    if (!medical_upload_allowed) {
      return res.status(403).json({ error: 'Medical upload not allowed. Contact recruiter.' });
    }

    await pool.query(
      `UPDATE dox
       SET medical_file_path = $1,
           medical_original_filename = $2,
           medical_file_size = $3,
           medical_uploaded_at = NOW(),
           medical_status = 'pending',
           medical_reason = NULL,
           medical_upload_allowed = false
       WHERE user_id = $4`,
      [file.path, file.originalname, file.size, userId]
    );

    res.json({
      message: 'Medical exam uploaded successfully',
      file: { path: file.path, originalname: file.originalname, size: file.size }
    });
  } catch (err) {
    console.error('Upload medical error:', err);
    res.status(500).json({ error: 'Failed to upload medical exam' });
  }
});

// POST /api/candidates/documents/police
router.post('/documents/police', upload.single('file'), async (req, res) => {
  const userId = req.user.employee_id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const doxResult = await pool.query(
      'SELECT police_upload_allowed, police_file_path FROM dox WHERE user_id = $1',
      [userId]
    );
    if (doxResult.rows.length === 0) {
      return res.status(404).json({ error: 'User document record not found' });
    }
    const { police_upload_allowed, police_file_path } = doxResult.rows[0];

    if (police_file_path) {
      return res.status(403).json({ error: 'Police document already uploaded. Contact recruiter if you need to re-upload.' });
    }
    if (!police_upload_allowed) {
      return res.status(403).json({ error: 'Police upload not allowed. Contact recruiter.' });
    }

    await pool.query(
      `UPDATE dox
       SET police_file_path = $1,
           police_original_filename = $2,
           police_file_size = $3,
           police_uploaded_at = NOW(),
           police_status = 'pending',
           police_reason = NULL,
           police_upload_allowed = false
       WHERE user_id = $4`,
      [file.path, file.originalname, file.size, userId]
    );

    res.json({
      message: 'Police verification uploaded successfully',
      file: { path: file.path, originalname: file.originalname, size: file.size }
    });
  } catch (err) {
    console.error('Upload police error:', err);
    res.status(500).json({ error: 'Failed to upload police verification' });
  }
});

// GET /api/candidates/hospitals - list hospitals with search & pagination
router.get('/hospitals', async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
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
    ORDER BY id
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
});

module.exports = router;