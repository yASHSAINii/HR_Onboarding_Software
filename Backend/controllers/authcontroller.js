const pool = require('../db');

const adminLogin = async (req, res) => {
  console.log('🔑 Login request received');
  
  try {
    const { email, password, userType } = req.body;
    
    // Validate request
    if (!email || !password || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, userType'
      });
    }
    
    if (userType !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Use candidate login for non-admin users'
      });
    }
    
    console.log(`📧 Searching for admin: ${email}`);
    
    // Query database
    const result = await pool.query(
      'SELECT * FROM admin_user WHERE mail_id = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    const user = result.rows[0];
    
    // Check password
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Remove password from response
    const { password: _, ...userData } = user;
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userData
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

module.exports = { adminLogin };