import pool from './config/db.config.js';

// Test database connection (optional, can be removed)
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
  }
};

testConnection();

export default pool;