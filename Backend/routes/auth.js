const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const { authLimiter } = require('../middleware/security');
const { verifyToken } = require('../middleware/auth');

const loginValidation = [
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('credential').isLength({ min: 6 }).withMessage('Credential must be at least 6 characters').trim(),
  body('role').isIn(['candidate', 'recruiter']).withMessage('Invalid role')
];

const setPasswordValidation = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .trim(),
  body('confirmPassword').trim()
];

// ------------------------------------------------------------
// POST /api/auth/login
// ------------------------------------------------------------
router.post('/login', authLimiter, loginValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, credential, role } = req.body;
    const invalidMsg = { error: 'Invalid credentials' };

    const userResult = await pool.query(
      `SELECT u.employee_id, u.first_name, u.role, u.status,
              a.password_hash, a.failed_attempt, a.locked_until,
              fl.otp AS fl_otp, fl.valid_until AS fl_valid_until, fl.new AS fl_new
       FROM users u
       LEFT JOIN auth a ON u.employee_id = a.user_id
       LEFT JOIN first_login fl ON u.employee_id = fl.user_id
       WHERE u.email = $1 AND u.role = $2`,
      [email, role]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json(invalidMsg);
    }

    const user = userResult.rows[0];

    if (user.status === 0) {
      return res.status(403).json({ error: 'Account is inactive. Contact admin.' });
    }

    // First-time login (credential is OTP)
    if (user.fl_new === true) {
      if (!user.fl_otp || !user.fl_valid_until || new Date(user.fl_valid_until) < new Date()) {
        return res.status(401).json({ error: 'OTP expired. Please request a new one.' });
      }
      const otpMatch = crypto.timingSafeEqual(
        Buffer.from(credential.padEnd(6, ' ')),
        Buffer.from(user.fl_otp.padEnd(6, ' '))
      );
      if (!otpMatch) {
        return res.status(401).json(invalidMsg);
      }

      const tempToken = jwt.sign(
        { employee_id: user.employee_id, purpose: 'set-password' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      res.cookie('temp_token', tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
      });
      return res.json({
        firstLogin: true,
        message: 'OTP verified. Please set your password.'
      });
    }

    // Returning user (credential is password)
    if (!user.password_hash) {
      return res.status(401).json(invalidMsg);
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(403).json({
        error: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`
      });
    }

    const isMatch = await bcrypt.compare(credential, user.password_hash);
    if (!isMatch) {
      const newFailedCount = (user.failed_attempt || 0) + 1;
      if (newFailedCount >= 5) {
        await pool.query(
          `UPDATE auth SET failed_attempt = $1, locked_until = NOW() + INTERVAL '15 minutes' WHERE user_id = $2`,
          [newFailedCount, user.employee_id]
        );
        return res.status(403).json({
          error: 'Too many failed attempts. Account locked for 15 minutes.'
        });
      }
      await pool.query(
        'UPDATE auth SET failed_attempt = $1 WHERE user_id = $2',
        [newFailedCount, user.employee_id]
      );
      return res.status(401).json(invalidMsg);
    }

// -----success----------
    await pool.query(
      `UPDATE auth SET failed_attempt = 0, locked_until = NULL, last_login = NOW() WHERE user_id = $1`,
      [user.employee_id]
    );

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { employee_id: user.employee_id, role: user.role, jti },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000
    });
    res.json({
      message: 'Login successful',
      user: {
        employee_id: user.employee_id,
        name: user.first_name,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// POST /api/auth/set-password
// ------------------------------------------------------------
router.post('/set-password', setPasswordValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const tempToken = req.cookies?.temp_token;
    if (!tempToken) {
      return res.status(401).json({ error: 'Session expired. Please login again with OTP.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Session expired. Please login again with OTP.' });
    }
    if (decoded.purpose !== 'set-password') {
      return res.status(401).json({ error: 'Invalid session.' });
    }

    const employee_id = decoded.employee_id;

    const flResult = await pool.query(
      'SELECT new FROM first_login WHERE user_id = $1',
      [employee_id]
    );
    if (flResult.rows.length === 0 || flResult.rows[0].new === false) {
      return res.status(400).json({ error: 'Password already set. Please login normally.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO auth (user_id, password_hash, failed_attempt) VALUES ($1, $2, 0)`,
        [employee_id, password_hash]
      );

      await client.query(
        `UPDATE first_login SET new = false, otp = '', valid_until = NOW(), updated_at = NOW() WHERE user_id = $1`,
        [employee_id]
      );

      await client.query('COMMIT');

      const roleResult = await client.query(
        'SELECT role FROM users WHERE employee_id = $1',
        [employee_id]
      );
      const role = roleResult.rows[0]?.role;
      if (!role) {
        throw new Error('User role not found');
      }

      const jti = crypto.randomUUID();
      const token = jwt.sign(
        { employee_id, role, jti },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 60 * 1000
      });

      res.clearCookie('temp_token');
      const nameResult = await client.query(
        'SELECT first_name FROM users WHERE employee_id = $1',
        [employee_id]
      );
      res.json({
        message: 'Password set successfully. You are now logged in.',
        user: {
          employee_id,
          role,
          name: nameResult.rows[0].first_name
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// GET /api/auth/me – restore session on page refresh
// ------------------------------------------------------------
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { employee_id } = req.user;
    const result = await pool.query(
      'SELECT employee_id, first_name, last_name, email, role FROM users WHERE employee_id = $1',
      [employee_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// ------------------------------------------------------------
// POST /api/auth/logout
// ------------------------------------------------------------
router.post('/logout', async (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const jti = decoded.jti;
      const exp = decoded.exp;
      const expiresAt = new Date(exp * 1000);
      await pool.query(
        `INSERT INTO token_blacklist (jti, expires_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING`,
        [jti, expiresAt]
      );
    } catch (err) {
      console.error('Invalid token during logout:', err.message);
    }
  }
  res.clearCookie('token');
  res.clearCookie('temp_token');
  res.json({ message: 'Logged out' });
});

module.exports = router;