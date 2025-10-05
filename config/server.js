import 'dotenv/config'; // Load environment variables from .env file first
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url'; // Required for __dirname equivalent in ES Modules

// ----------------------------------------------------
// FIX: Corrected router names and paths to be one level up in the 'routes/' folder.
// The routes folder is now a direct sibling of the config folder.
import filesRouter from '../routes/files.js'; 
import authRouter from '../routes/authRoute.js'; 
// ----------------------------------------------------

// Define __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the root directory path (up one level from 'config')
const rootDir = path.resolve(__dirname, '..');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json()); // Body parser for JSON requests

// Serve static files (like the HTML client tester)
// We serve the root directory which contains index.html
app.use(express.static(rootDir));

// --- API Routes ---
// Mount the routers under the /api path
app.use('/api/files', filesRouter);
app.use('/api/auth', authRouter); // This sets up the base path /api/auth

// Basic check route (optional)
app.get('/api', (req, res) => {
    res.send('File Drive API is running.');
});

// --- Server Start ---
const PORT = process.env.PORT || 3000;

// Export the configured app instance
export { app, PORT }; // FIX: Exporting app and PORT as named exports