import { promises as fs } from 'fs';
import path from 'path';
import pool from '../db.js'; // FIX: Corrected path to root db.js

// --- Configuration ---
// Read the storage path from environment variables, defaulting to './uploads'
const STORAGE_PATH = process.env.STORAGE_PATH || './uploads';


/**
 * Retrieves the file record metadata from the database.
 * @param {string} fileId - The ID of the file to retrieve.
 * @param {string} userId - The ID of the user (for ownership check).
 * @returns {Promise<object | null>} The file record or null if not found.
 */
export async function getFileRecord(fileId, userId) {
    const result = await pool.query(
        // NOTE: Using 'storage_key' as the column name for the physical filename
        `SELECT id, name, storage_key, mime_type, is_folder 
         FROM files 
         WHERE id = $1 AND user_id = $2 AND is_folder = FALSE`,
        [fileId, userId]
    );

    return result.rows[0] || null;
}

/**
 * Creates a read stream for a physical file on disk.
 * @param {string} storageKey - The unique filename used on the disk.
 * @returns {fs.ReadStream} The readable file stream.
 */
export function getFileStream(storageKey) {
    const fullPath = path.resolve(STORAGE_PATH, storageKey);

    // Create a read stream. Node will throw an error (handled by the caller) 
    // if the file doesn't exist, which is cleaner than checking fs.existsSync.
    return fs.createReadStream(fullPath);
}
