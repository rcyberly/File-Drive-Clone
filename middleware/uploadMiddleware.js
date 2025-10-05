// middleware/uploadMiddleware.js

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- Path Setup ---
// These steps are required to correctly determine the project root directory
// when using ES Modules (import/export).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the storage directory: Go up one level (out of 'middleware' folder)
// and look for the 'storage' folder in the root directory.
const STORAGE_PATH = path.join(__dirname, '..', 'storage'); 

// Create the storage directory if it doesn't exist
// This ensures Multer has a place to put temporary files.
if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
    console.log(`[Middleware] Created storage directory: ${STORAGE_PATH}`);
}


// --- 1. Disk Storage Configuration ---
// Defines how files are stored on disk (where they go and what they are named).
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Multer saves the file to the root 'storage' folder first.
        cb(null, STORAGE_PATH);
    },
    filename: (req, file, cb) => {
        // Generates a unique filename using a timestamp and random hash
        const uniqueKey = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        // This 'uniqueKey' will be stored in the database as 'storage_key'.
        cb(null, uniqueKey);
    }
});


// --- 2. Multer Upload Instance ---
// Increased the limit from 50MB to 100MB
const upload = multer({
    storage: storage,
    limits: { 
        // 100MB = 100 * 1024 * 1024 = 104,857,600 bytes
        fileSize: 100 * 1024 * 1024 
    }
});


// --- Export ---
// This default export is imported as 'upload' in routes/file.js
export default upload;
