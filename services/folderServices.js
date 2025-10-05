import pool from '../config/db.js'; 
import { promises as fs } from 'fs';
import path from 'path';

// Read the storage path from environment variables for physical file operations
const STORAGE_PATH = process.env.STORAGE_PATH || './uploads';


/**
 * Helper to recursively delete an item (file or folder) and its physical file if it exists.
 * MUST be executed within a PostgreSQL transaction (requires client).
 * @param {string} itemId - The ID of the item (file or folder) to delete.
 * @param {string} userId - The ID of the owner.
 * @param {object} client - The PostgreSQL client acquired from pool.connect().
 */
export const deleteItemRecursive = async (itemId, userId, client) => {
    // 1. Get the item details and check ownership
    // NOTE: Using 'storage_key' as the column name for the physical filename
    const itemResult = await client.query(
        'SELECT is_folder, storage_key FROM files WHERE id = $1 AND user_id = $2',
        [itemId, userId]
    );
    if (itemResult.rows.length === 0) return; // Already deleted or not owned

    const item = itemResult.rows[0];
    
    // 2. If it's a folder, recursively delete its contents
    if (item.is_folder) {
        // Find all children
        const childrenResult = await client.query(
            'SELECT id FROM files WHERE parent_id = $1 AND user_id = $2', 
            [itemId, userId] 
        );
        
        for (const child of childrenResult.rows) {
            await deleteItemRecursive(child.id, userId, client); // Recurse
        }
    }

    // 3. Delete the physical file (only if it exists and is not a folder)
    if (item.storage_key) { 
        const filePath = path.join(STORAGE_PATH, item.storage_key); 
        try {
            await fs.unlink(filePath);
        } catch (error) {
            // Ignore ENOENT (file not found on disk) but log other errors
            if (error.code !== 'ENOENT') {
                console.error(`[FS Error] Failed to delete physical file ${filePath}:`, error);
                throw error; 
            }
        }
    }

    // 4. Delete the entry from the database
    // The user_id is included in the WHERE clause for an extra layer of security
    await client.query('DELETE FROM files WHERE id = $1 AND user_id = $2', [itemId, userId]);
};


/**
 * Creates a new folder record in the database.
 * @param {string} userId - The ID of the owner.
 * @param {string} name - The name of the folder.
 * @param {string | null} parentId - The parent folder ID or null for root.
 * @returns {Promise<object>} The created folder record.
 */
export async function createFolderRecord(userId, name, parentId) {
    const result = await pool.query(
        // is_folder is set to TRUE
        `INSERT INTO files (name, is_folder, user_id, parent_id) 
         VALUES ($1, TRUE, $2, $3) 
         RETURNING id, name, is_folder, created_at, parent_id`,
        [name, userId, parentId]
    );
    return result.rows[0];
}

/**
 * Checks if a given ID belongs to an existing folder owned by the user.
 * @param {string} folderId - The ID to check.
 * @param {string} userId - The owner ID.
 * @returns {Promise<boolean>} True if it's a valid folder, false otherwise.
 */
export async function isUserFolder(folderId, userId) {
    const result = await pool.query(
        "SELECT id FROM files WHERE id = $1 AND user_id = $2 AND is_folder = TRUE",
        [folderId, userId]
    );
    return result.rows.length > 0;
}

/**
 * Updates the name and/or parent ID of a file or folder.
 * @param {string} itemId - The ID of the item to update.
 * @param {string} userId - The owner ID.
 * @param {string} newName - The new name (optional).
 * @param {string | null} newParentId - The new parent ID (optional).
 * @returns {Promise<object | null>} The updated item record or null if not found/no changes.
 */
export async function updateItemRecord(itemId, userId, newName, newParentId) {
    let queryParts = [];
    let queryValues = [];
    let valueIndex = 1;
    
    if (newName !== undefined) {
        queryParts.push(`name = $${valueIndex++}`);
        queryValues.push(newName);
    }
    
    // NOTE: newParentId can explicitly be null if moving to root
    if (newParentId !== undefined) { 
        queryParts.push(`parent_id = $${valueIndex++}`);
        queryValues.push(newParentId);
    }

    if (queryParts.length === 0) {
        return null;
    }
    
    queryParts.push(`updated_at = NOW()`);
    
    // The WHERE clause arguments come last
    queryValues.push(itemId);
    queryValues.push(userId);
    
    const updateQuery = `
        UPDATE files 
        SET ${queryParts.join(', ')} 
        WHERE id = $${valueIndex++} AND user_id = $${valueIndex++} 
        RETURNING id, name, is_folder, parent_id, updated_at
    `;
    
    const result = await pool.query(updateQuery, queryValues);
    return result.rows[0] || null;
}

/**
 * Retrieves an item's current state (used for rename/move validation).
 * @param {string} itemId - The ID of the item.
 * @param {string} userId - The owner ID.
 * @returns {Promise<object | null>} The item record or null if not found.
 */
export async function getItemState(itemId, userId) {
    const result = await pool.query(
        "SELECT id, is_folder, parent_id, name FROM files WHERE id = $1 AND user_id = $2",
        [itemId, userId]
    );
    return result.rows[0] || null;
}
