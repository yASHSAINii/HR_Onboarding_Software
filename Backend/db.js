import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

console.log('Connecting to database...');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hr_onb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'yashsaini',
  max: 10,
  idleTimeoutMillis: 30000,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

export default pool;