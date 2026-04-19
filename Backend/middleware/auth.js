const jwt = require('jsonwebtoken');
const pool = require('../db');

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const jti = decoded.jti;

    // Check blacklist--------------
    const blacklistResult = await pool.query(
      'SELECT 1 FROM token_blacklist WHERE jti = $1',
      [jti]
    );
    if (blacklistResult.rows.length > 0) {
      return res.status(401).json({ error: 'Token revoked. Please login again.' });
    }
    // { employee_id, role, jti, iat, exp }------
    req.user = decoded;  
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

module.exports = { verifyToken, requireRole };