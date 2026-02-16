import express from 'express';
import bcrypt from 'bcryptjs'; 
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

router.post('/admin-login', async (req, res) => {
  console.log('🔑 Login attempt:', req.body.email);
  
  try {
    const { email, password, userType } = req.body;
    
    if (userType !== 'admin') {
      return res.status(400).json({ error: 'Use admin login' });
    }
    
    // Direct database connection
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'hr_onb',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'yashsaini',
    });
    
    const result = await pool.query(
      'SELECT * FROM admin_user WHERE mail_id = $1',
      [email]
    );
    
    await pool.end();
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // IMPORTANT CHANGE: Use bcrypt.compare instead of direct comparison
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Remove password from response
    const { password: _, ...userData } = user;
    res.json({
      success: true,
      message: 'Login successful',
      user: userData
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;