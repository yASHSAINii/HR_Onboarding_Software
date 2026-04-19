const pool = require('../db');

async function uploadMedicalExam(req, res) {
  const userId = req.user.employee_id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Check if medical upload is allowed
    const doxResult = await pool.query(
      'SELECT medical_upload_allowed FROM dox WHERE user_id = $1',
      [userId]
    );
    if (doxResult.rows.length === 0) {
      return res.status(404).json({ error: 'User document record not found' });
    }
    if (!doxResult.rows[0].medical_upload_allowed) {
      return res.status(403).json({ error: 'Medical upload not allowed. Contact recruiter.' });
    }

    // Update medical document fields
    await pool.query(
      `UPDATE dox
       SET medical_file_path = $1,
           medical_original_filename = $2,
           medical_file_size = $3,
           medical_uploaded_at = NOW(),
           medical_status = 'pending',
           medical_reason = NULL
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
}

async function uploadPoliceVerification(req, res) {
  const userId = req.user.employee_id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Check if police upload is allowed
    const doxResult = await pool.query(
      'SELECT police_upload_allowed FROM dox WHERE user_id = $1',
      [userId]
    );
    if (doxResult.rows.length === 0) {
      return res.status(404).json({ error: 'User document record not found' });
    }
    if (!doxResult.rows[0].police_upload_allowed) {
      return res.status(403).json({ error: 'Police upload not allowed. Contact recruiter.' });
    }

    await pool.query(
      `UPDATE dox
       SET police_file_path = $1,
           police_original_filename = $2,
           police_file_size = $3,
           police_uploaded_at = NOW(),
           police_status = 'pending',
           police_reason = NULL
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
}

module.exports = { uploadMedicalExam, uploadPoliceVerification };