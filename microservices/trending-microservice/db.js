import pkg from 'pg';
import 'dotenv/config';
const { Pool } = pkg;

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
    ssl: { rejectUnauthorized: false } // Use this line if you encounter SSL issues
});

// const pool = new Pool({
//     user: 'alvinvictor',
//     host: 'postgres', // Change this to the correct host if needed
//     database: 'socialblog',
//     password: 'alvinvictor',
//     port: 5432,
// });

export default pool;