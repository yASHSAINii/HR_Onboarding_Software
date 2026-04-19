const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const templateRoutes = require('./routes/templates');
const candidateRoutes = require('./routes/candidates');
const recruiterRoutes = require('./routes/recruiter');

const cron = require('node-cron');
const { checkDocumentUploads, refreshExpiredOtps } = require('./services/scheduler');
const pool = require('./db');

// Cron jobs ---------------
cron.schedule('0 */2 * * *', () => {
  console.log('Running document upload check...');
  checkDocumentUploads();
});
cron.schedule('0 2 * * *', () => {
  console.log('Running OTP refresh...');
  refreshExpiredOtps();
});
cron.schedule('0 3 * * *', async () => {
  try {
    const result = await pool.query('DELETE FROM token_blacklist WHERE expires_at < NOW()');
    if (result.rowCount > 0) {
      console.log(`Cleaned up ${result.rowCount} expired blacklist entries.`);
    }
  } catch (err) {
    console.error('Error cleaning token blacklist:', err);
  }
});

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// API routes only
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/recruiter', recruiterRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});
// No static files, no catch-all. Only API routes.
// The React dev server on port 3000 handles all frontend routes.

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));