import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

// @desc    Register a new admin user
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { first_name, last_name, mail_id, password, role, permissions, phone_num } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !mail_id || !password || !role || !permissions) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM admin_user WHERE mail_id = $1', [mail_id]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const newUser = await pool.query(
      `INSERT INTO admin_user (first_name, last_name, mail_id, password, role, permissions, phone_num)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, mail_id, role, permissions, phone_num`,
      [first_name, last_name, mail_id, hashedPassword, role, permissions, phone_num || null]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: newUser.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Original login (using mail_id)
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { mail_id, password } = req.body;

    if (!mail_id || !password) {
      return res.status(400).json({ success: false, error: 'Mail ID and password required' });
    }

    const result = await pool.query('SELECT * FROM admin_user WHERE mail_id = $1', [mail_id]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, mail_id: user.mail_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '1h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        mail_id: user.mail_id,
        role: user.role,
        permissions: user.permissions,
        phone_num: user.phone_num,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin login (used by your frontend)
// @route   POST /api/auth/admin-login
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType) {
      return res.status(400).json({ success: false, error: 'Email, password, and user type are required' });
    }

    const result = await pool.query('SELECT * FROM admin_user WHERE mail_id = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Role-based access control (adjust based on your role values)
    const roleMap = {
      admin: ['hr_manager', 'admin', 'recruiter'],
      candidate: ['candidate'],
    };
    const allowedRoles = roleMap[userType] || [];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied for this user type' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, mail_id: user.mail_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '1h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        mail_id: user.mail_id,
        role: user.role,
        permissions: user.permissions,
        phone_num: user.phone_num,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user profile (protected)
// @route   GET /api/auth/profile
export const profile = async (req, res, next) => {
  try {
    const user = await pool.query(
      'SELECT id, first_name, last_name, mail_id, role, permissions, phone_num FROM admin_user WHERE id = $1',
      [req.user.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user: user.rows[0] });
  } catch (err) {
    next(err);
  }
};