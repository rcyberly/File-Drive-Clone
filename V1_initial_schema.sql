-- V1_initial_schema.sql - Unified File and Folder Storage

-- 1. Create the 'users' table
-- This table will store basic user information.
CREATE TABLE IF NOT EXISTS users (
    -- Standardized to use the preferred gen_random_uuid() function
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL, -- To store the bcrypt hash
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create the 'files' table
-- This table stores records for both files and folders in the drive (unified storage model).
CREATE TABLE IF NOT EXISTS files (
    -- Standardized to use the preferred gen_random_uuid() function
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    is_folder BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE for folders, FALSE for files

    -- Foreign Key: Links the file/folder to its owner
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, 

    -- Foreign Key: Links the file/folder to its parent folder (optional, NULL for root)
    parent_id UUID REFERENCES files(id) ON DELETE CASCADE, 

    -- Only relevant for files (is_folder = FALSE)
    file_path VARCHAR(255), -- The unique filename given by Multer, stored locally
    size BIGINT DEFAULT 0,    -- Size in bytes
    file_type VARCHAR(100),   -- MIME type

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Ensures no two items in the same folder and owned by the same user can have the same name.
    UNIQUE (owner_id, parent_id, name)
);

-- 3. Create an index for quick lookups by parent folder (hierarchy traversal)
CREATE INDEX IF NOT EXISTS idx_files_parent_id ON files (parent_id);

-- 4. Create an index for quick lookups by user (for displaying all user files)
CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files (owner_id);

-- NOTE: Triggers for updated_at are typically handled in a separate, later migration script (V2, V3, etc.) 
-- or directly in the application layer. Keeping the schema clean for V1.
