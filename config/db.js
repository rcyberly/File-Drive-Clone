import pg from 'pg';
import 'dotenv/config'; // Ensure dotenv is imported to load process.env

const { Pool } = pg;

// Use the DATABASE_URL environment variable.
// Example format: postgres://user:password@host:port/database_name
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('FATAL ERROR: DATABASE_URL is not set in environment variables. Please check your .env file.');
    // Exit or throw error if DB is critical for startup
    process.exit(1); 
}

// Simple function to extract DB name from URL for logging
function getDbName(url) {
    try {
        const parsedUrl = new URL(url);
        // pathname is /database_name, so we slice off the leading '/'
        const dbName = parsedUrl.pathname.substring(1); 
        return dbName || 'DB Name Missing!';
    } catch (e) {
        return 'Invalid URL format!';
    }
}

const dbName = getDbName(connectionString);

console.log(`[DB] Attempting connection to database: ${dbName}`);

const pool = new Pool({
    connectionString: connectionString,
    // Add SSL configuration if connecting to a hosted database like Render/Heroku
    // ssl: {
    //     rejectUnauthorized: false
    // }
});

// Test connection and log success/failure
pool.connect()
    .then(client => {
        console.log(`✅ Database connected successfully!`);
        console.log(`Database connected successfully: ${new Date().toISOString()}`);
        client.release(); // Release the client back to the pool
    })
    .catch(err => {
        console.error('❌ Database connection error:', err.message);
        process.exit(1);
    });

export default pool;
