import pkg from 'pg';
const {Pool} = pkg;
const pool = new Pool({
host: "localhost",
user: "postgres",
password: "yashsaini",
database: "hr_onb",
port: "5432",
});

export default pool;