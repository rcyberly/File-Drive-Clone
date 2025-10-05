// FIX: Path corrected to point to config/database.js at the root level
import pool from '../config/database.js'; 
import { promises as fs } from 'fs';

// Helper to recursively delete files/folders and their physical files
// This helper is shared between the folder and file deletion logic
const deleteItemRecursive = async (itemId, userId, client) => {
    // 1. Get the item details and check ownership
    const itemResult = await client.query(
        'SELECT is_folder, stored_name FROM files WHERE file_id = $1 AND user_id = $2',
        [itemId, userId]
    );
    if (itemResult.rows.length === 0) return; // Item already deleted or not owned

    const item = itemResult.rows[0];
    
    // 2. If it's a folder, recursively delete its contents
    if (item.is_folder) {
        // Find all children
        const childrenResult = await client.query(
            'SELECT file_id, stored_name FROM files WHERE parent_id = $1', 
            [itemId]
        );
        
        for (const child of childrenResult.rows) {
            // Recurse: delete child (which handles files or sub-folders)
            await deleteItemRecursive(child.file_id, userId, client); 
        }
    }

    // 3. Delete the physical file (only if it exists and is not a folder)
    if (item.stored_name) { // only files have stored_name set
        const filePath = `./uploads/${item.stored_name}`; // Using relative path for simplicity in controller
        try {
            await fs.unlink(filePath);
            console.log(`Successfully deleted physical file: ${filePath}`);
        } catch (error) {
            // Ignore ENOENT (file not found on disk) but log other errors
            if (error.code !== 'ENOENT') {
                console.error(`Failed to delete physical file ${filePath}:`, error);
                throw error; // Propagate error to rollback transaction
            }
        }
    }

    // 4. Delete the entry from the database
    await client.query('DELETE FROM files WHERE file_id = $1', [itemId]);
};


/**
 * Creates a new folder entry in the database.
 */
export const createFolder = async (req, res) => {
    const userId = req.user.userId;
    const { folderName, parentId } = req.body;

    if (!folderName || folderName.trim() === '') {
        return res.status(400).json({ message: 'Folder name is required.' });
    }

    // Validate parentId (must be a folder if provided)
    let resolvedParentId = parentId || null;
    if (resolvedParentId) {
        const parentCheck = await pool.query(
            "SELECT file_id FROM files WHERE file_id = $1 AND user_id = $2 AND is_folder = TRUE",
            [resolvedParentId, userId]
        );
        if (parentCheck.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid parent folder ID.' });
        }
    }

    try {
        const result = await pool.query(
            `INSERT INTO files (user_id, file_name, is_folder, parent_id, upload_date) 
             VALUES ($1, $2, TRUE, $3, NOW()) 
             RETURNING file_id, file_name, is_folder, parent_id, upload_date`,
            [userId, folderName, resolvedParentId]
        );

        res.status(201).json({ 
            message: 'Folder created successfully',
            folder: result.rows[0] 
        });

    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ message: 'Internal server error while creating folder.' });
    }
};

/**
 * Renames a file or folder.
 */
export const renameItem = async (req, res) => {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { newName } = req.body;

    if (!newName || newName.trim() === '') {
        return res.status(400).json({ message: 'New name is required.' });
    }

    try {
        const result = await pool.query(
            `UPDATE files 
             SET file_name = $1, last_modified = NOW()
             WHERE file_id = $2 AND user_id = $3
             RETURNING file_id, file_name, is_folder`,
            [newName, itemId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found or unauthorized.' });
        }

        res.status(200).json({ 
            message: 'Item renamed successfully',
            item: result.rows[0]
        });

    } catch (error) {
        console.error('Error renaming item:', error);
        res.status(500).json({ message: 'Internal server error while renaming item.' });
    }
};

/**
 * Moves a file or folder to a new parent folder.
 */
export const moveItem = async (req, res) => {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { targetParentId } = req.body; // Can be null (root) or a folder ID

    let resolvedTargetId = targetParentId || null;

    try {
        // 1. Check if the item exists and belongs to the user
        const checkResult = await pool.query(
            'SELECT is_folder FROM files WHERE file_id = $1 AND user_id = $2', 
            [itemId, userId]
        );
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found or unauthorized.' });
        }
        
        // Prevent moving an item into itself
        if (resolvedTargetId && itemId === resolvedTargetId) {
            return res.status(400).json({ message: 'Cannot move an item into itself.' });
        }

        // 2. Validate the target parent ID
        if (resolvedTargetId) {
            const parentCheck = await pool.query(
                "SELECT file_id FROM files WHERE file_id = $1 AND user_id = $2 AND is_folder = TRUE",
                [resolvedTargetId, userId]
            );
            if (parentCheck.rows.length === 0) {
                return res.status(400).json({ message: 'Invalid destination folder.' });
            }
        }
        
        // 3. Perform the move
        const updateResult = await pool.query(
            `UPDATE files 
             SET parent_id = $1, last_modified = NOW() 
             WHERE file_id = $2 AND user_id = $3
             RETURNING file_id, parent_id, file_name`,
            [resolvedTargetId, itemId, userId]
        );

        res.status(200).json({ 
            message: 'Item moved successfully',
            item: updateResult.rows[0]
        });

    } catch (error) {
        console.error('Error moving item:', error);
        res.status(500).json({ message: 'Internal server error while moving item.' });
    }
};

/**
 * Deletes a folder and all its contents (files and subfolders) recursively.
 */
export const deleteFolderRecursive = async (req, res) => {
    const userId = req.user.userId;
    const { folderId } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if the item is a folder and is owned by the user
        const checkFolder = await client.query('SELECT is_folder FROM files WHERE file_id = $1 AND user_id = $2', [folderId, userId]);
        if (checkFolder.rows.length === 0 || !checkFolder.rows[0].is_folder) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Folder not found or unauthorized.' });
        }

        // Use the shared recursive delete helper
        await deleteItemRecursive(folderId, userId, client); 
        
        await client.query('COMMIT');
        res.status(200).json({ message: 'Folder and its contents deleted successfully.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during recursive folder deletion:', error);
        res.status(500).json({ message: 'Internal server error during deletion.' });
    } finally {
        client.release();
    }
};

// Export the recursive helper so fileController can reuse it for single file delete, 
// if you decide to consolidate logic later.
export { deleteItemRecursive }; 
