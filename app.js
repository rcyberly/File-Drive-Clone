/*import express from 'express';
import cors from 'cors';
import 'dotenv/config'; 
// FIX 1: Paths corrected to look for modules relative to the root/app.js location.
import authRoutes from './routes/auth.js'; 
import fileRoutes from './routes/file.js'; 


// FIX 2: Corrected path for db.js which is now a sibling file to app.js
import pool from './db.js'; 

const app = express();
// Load port from .env or default to 3000
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Body parser for JSON requests

// Basic server test route
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Secure File Drive API is running successfully!' });
});

// Route Handlers
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// --- Database Check ---
// Function to verify the database connection on server startup
async function checkDatabaseConnection() {
    try {
        // Run a simple query to ensure the pool is working
        await pool.query('SELECT 1');
        console.log('✅ Database connected successfully!');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('Ensure PostgreSQL is running and your .env file is configured correctly.');
    }
}

// Start Server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Check database connection immediately after the server starts listening
    await checkDatabaseConnection();
});
*/

import express from 'express';
import cors from 'cors';
import 'dotenv/config'; 
import path from 'path'; // Needed to join paths reliably
import { fileURLToPath } from 'url'; // Needed to get the current directory in ES Modules

// Helper to define __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. FIX: Corrected file names and paths for Route Handlers ---
// Routes files are named 'authRoute.js' and 'files.js'
import authRoutes from './routes/auth.js'; 
import fileRoutes from './routes/file.js'; 


// --- 2. FIX: Corrected path for db.js ---
// Assuming db.js is now inside the 'database' folder at the root.
import pool from './db.js'; 

const app = express();
// Load port from .env or default to 3000
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Body parser for JSON requests


// --- 3. FIX: Add Static File Middleware to serve pages and client assets ---
// This middleware allows Express to serve HTML, CSS, JS, etc., from the project root.
// This resolves the "Cannot GET /" and "Cannot GET /index.html" errors.
// If an index.html file exists in the root, it will be served automatically for the '/' route.
app.use(express.static(__dirname)); // Serves static files from the root directory


// Basic server test route: Use /api or /status to check server health, 
// leaving '/' free for the static index.html file.
app.get('/status', (req, res) => {
    res.status(200).json({ message: 'Secure File Drive API is running successfully!' });
});

// Route Handlers
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// --- Database Check ---
// Function to verify the database connection on server startup
async function checkDatabaseConnection() {
    try {
        // Run a simple query to ensure the pool is working
        await pool.query('SELECT 1');
        console.log('✅ Database connected successfully!');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('Ensure PostgreSQL is running and your .env file is configured correctly.');
    }
}

// Start Server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Check database connection immediately after the server starts listening
    await checkDatabaseConnection();
});
