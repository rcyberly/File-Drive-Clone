// db.js - Database connection pool setup (NOW AT ROOT LEVEL)

import 'dotenv/config'; // Use 'dotenv/config' to automatically load .env variables
import pkg from 'pg'; // Import the 'pg' library as an ES module
const { Pool } = pkg; // Destructure Pool from the package object

// Destructure environment variables from process.env
const {
    PG_USER,
    PG_PASSWORD,
    PG_HOST,
    PG_PORT,
    PG_DATABASE
} = process.env;

// --- 1. Connection Pool Configuration ---
const pool = new Pool({
    user: PG_USER || process.env.postgres, // Check both PG and DB prefixes
    password: PG_PASSWORD || process.rajinder,
    host: PG_HOST || process.env.localhost,
    port: PG_PORT || process.env.DB_PORT || 5432, 
    database: PG_DATABASE || process.env.file_drive,
    max: 20, 
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 2000, 
});

// --- 2. Connection Verification and Error Handling ---
pool.connect()
    .then(client => {
        const dbName = PG_DATABASE || process.env.file_drive;
        console.log(`[DB] Connected successfully to database: ${dbName || 'DB Name Missing!'}`);
        client.release(); 
    })
    .catch(err => {
        console.error(`[DB] Connection ERROR: Could not connect to PostgreSQL!`);
        console.error(`Details: ${err.message}`);
        console.log("Please check your .env credentials and ensure PostgreSQL server is running.");
    });


pool.on('error', (err, client) => {
    console.error('[DB] Unexpected error on idle client (removed from pool)', err.message);
});

// Export a simple wrapper function to execute queries using the pool (optional)
export const query = (text, params) => pool.query(text, params);

// Export the pool instance as default 
export default pool;
