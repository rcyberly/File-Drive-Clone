import pg from 'pg';
import 'dotenv/config'; // Ensure dotenv is imported to load process.env

const { Pool } = pg;

// Use the DATABASE_URL environment variable.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('FATAL ERROR: DATABASE_URL is not set in environment variables. Please check your config.');
    process.exit(1); 
}

// 1. Determine if we are in a production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

// Simple function to extract DB name from URL for logging
function getDbName(url) {
    try {
        const parsedUrl = new URL(url);
        const dbName = parsedUrl.pathname.substring(1); 
        return dbName || 'DB Name Missing!';
    } catch (e) {
        return 'Invalid URL format!';
    }
}

const dbName = getDbName(connectionString);

console.log(`[DB] Attempting connection to database: ${dbName}`);

// 2. Build the configuration object
const poolConfig = {
    connectionString: connectionString,
};

// 3. Conditionally add SSL configuration for production deployment
if (isProduction) {
    console.log('[DB] Running in production mode, enforcing SSL.');
    // This is required for most cloud providers (like Render)
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
} else {
    // If running locally, skip the SSL setting to avoid the error.
    console.log('[DB] Running in development mode, skipping SSL.');
}

const pool = new Pool(poolConfig);

// Test connection and log success/failure
pool.connect()
    .then(client => {
        console.log(`✅ Database connected successfully!`);
        console.log(`[DB] Connected successfully to database: ${dbName}`);
        console.log(`Database connected successfully: ${new Date().toISOString()}`);
        client.release(); // Release the client back to the pool
    })
    .catch(err => {
        console.error('❌ Database connection error:', err.message);
        process.exit(1);
    });

export default pool;
