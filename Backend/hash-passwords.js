import bcrypt from 'bcryptjs';
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

console.log(' Starting password hashing process...');
console.log(' Current directory:', process.cwd());

async function hashExistingPasswords() {
  // Validate environment variables
  console.log('\n Checking environment configuration...');
  console.log(` Database: ${process.env.DB_NAME || 'hr_onb'}`);
  console.log(` User: ${process.env.DB_USER || 'postgres'}`);
  console.log(` Password in .env: ${process.env.DB_PASSWORD ? 'Set' : 'Missing'}`);
  
  if (!process.env.DB_PASSWORD) {
    console.error('\n ERROR: DB_PASSWORD not found in .env file');
    console.log('Make sure .env file exists in Backend folder with:');
    console.log('DB_PASSWORD=yashsaini');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'hr_onb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('\n Connecting to PostgreSQL...');
    
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('Database connected:', testResult.rows[0].now);
    
    // Check admin_user table
    const tableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_user'
      ) as exists
    `);
    
    if (!tableResult.rows[0].exists) {
      console.error('\n ERROR: admin_user table does not exist!');
      await pool.end();
      process.exit(1);
    }
    
    console.log('admin_user table found');
    
    // Get all users
    const users = await pool.query('SELECT * FROM admin_user');
    console.log(`\n👥 Found ${users.rows.length} admin users`);
    
    if (users.rows.length === 0) {
      console.log('\n No users found. Creating default admin...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(`
        INSERT INTO admin_user 
        (first_name, last_name, mail_id, password, role, permissions, phone_num)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['Admin', 'User', 'admin@hr.com', hashedPassword, 'admin', 'Full', '+911234567890']);
      
      console.log('Default admin created');
      console.log('   Email: admin@hr.com');
      console.log('   Password: admin123 (already hashed)');
    }
    
    // Hash plain text passwords
    console.log('\n Checking password formats...');
    let hashedCount = 0;
    
    for (const user of users.rows) {
      const password = user.password;
      
      // Check if already hashed (bcrypt hashes start with $2a$ or $2b$)
      const isAlreadyHashed = password.startsWith('$2a$') || password.startsWith('$2b$');
      
      if (!isAlreadyHashed) {
        console.log(`\n User: ${user.first_name} ${user.last_name} (${user.mail_id})`);
        console.log(`   Old password (plain text): ${password}`);
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update in database
        await pool.query(
          'UPDATE admin_user SET password = $1 WHERE id = $2',
          [hashedPassword, user.id]
        );
        
        console.log(` Password hashed`);
        hashedCount++;
      } else {
        console.log(`${user.mail_id} - Already hashed`);
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('HASHING COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total users checked: ${users.rows.length}`);
    console.log(`Passwords hashed: ${hashedCount}`);
    console.log(`Already secured: ${users.rows.length - hashedCount}`);
    
    if (hashedCount > 0) {
      console.log('\n SUCCESS: All plain text passwords have been secured!');
      console.log('\n IMPORTANT:');
      console.log('   1. Restart your server');
      console.log('   2. Test login with your existing credentials');
      console.log('   3. Passwords will now be verified using bcrypt');
    } else {
      console.log('\n All passwords are already securely hashed');
    }
    
    // Show login test credentials
    console.log('\n TEST LOGIN CREDENTIALS:');
    const testUsers = await pool.query(
      'SELECT mail_id, first_name, last_name FROM admin_user LIMIT 3'
    );
    
    testUsers.rows.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.first_name} ${user.last_name} <${user.mail_id}>`);
    });
    
  } catch (error) {
    console.error('\n ERROR:', error.message);
    console.log('\n TROUBLESHOOTING:');
    console.log('   1. Check if PostgreSQL service is running');
    console.log('   2. Verify .env file has correct password: yashsaini');
    console.log('   3. Ensure hr_onb database exists');
  } finally {
    await pool.end();
    console.log('\n Database connection closed');
  }
}

// Run the function
hashExistingPasswords();