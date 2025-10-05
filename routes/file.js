// routes/files.js

import { Router } from 'express';
// FIX 1: Corrected path. Now points up one level (../) to the 'middleware' directory.
import upload from '../middleware/uploadMiddleware.js';
// FIX 2: Corrected path. Now points up one level (../) to the 'middleware' directory.
import { authMiddleware } from '../middleware/authMiddleware.js'; 

// FIX 3: Corrected path. Now points up one level (../) to the 'controllers' directory
// which is where the old 'src/controllers' contents should now reside.
import {
    listFiles,
    createItem,
    updateItem,
    deleteItem,
    downloadFile
} from '../controllers/fileController.js';

const router = Router();

// All routes below require authentication via the 'protect' middleware
// Using the correct imported middleware function name: authMiddleware
router.use(authMiddleware);

// -------------------------------------------------------------
// GET /api/files
// Lists all files/folders in the current directory (root or specified parent_id)
// Query parameters: ?parent_id=... (or 'root')
router.get('/', listFiles);

// -------------------------------------------------------------
// POST /api/files
// Handles both file uploads and folder creation.
router.post(
    '/',
    // Multer middleware: Looks for a field named 'file' in the form data
    upload.single('file'),
    createItem
);

// -------------------------------------------------------------
// PUT /api/files/:id
// Renames or moves a file/folder.
// Body: { name: 'new name', parent_id: 'new_folder_id' }
router.put('/:id', updateItem);

// -------------------------------------------------------------
// DELETE /api/files/:id
// Deletes a file or folder (recursively deletes contents if it's a folder).
router.delete('/:id', deleteItem);

// -------------------------------------------------------------
// GET /api/files/:id/download
// Initiates the download of a specific file.
router.get('/:id/download', downloadFile);


export default router;
