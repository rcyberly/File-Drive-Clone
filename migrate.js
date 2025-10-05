// migrate.js - Script to apply the initial database schema

import fs from 'fs';
import path from 'path';
import pool from './db.js'; // Import the connection pool we set up
import { fileURLToPath } from 'url';

// Helper to get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the SQL schema file
const schemaPath = path.join(__dirname, 'V1_initial_schema.sql');

/**
 * Reads the SQL schema file and executes the commands against the database.
 */
async function runMigrations() {
  console.log('Starting database migration...');

  let client;
  try {
    // 1. Read the SQL file content
    const schemaSql = fs.readFileSync(schemaPath, { encoding: 'utf8' });
    
    if (!schemaSql) {
        console.error('Migration failed: SQL schema file is empty or could not be read.');
        return;
    }

    // 2. Acquire a client from the pool
    // We use a single client and a transaction for atomicity (all or nothing)
    client = await pool.connect();

    // 3. Begin the transaction
    await client.query('BEGIN');
    console.log('Transaction started.');

    // 4. Execute the entire SQL script
    // pg will execute multiple statements separated by semicolons
    console.log('Executing SQL from V1_initial_schema.sql...');
    await client.query(schemaSql);

    // 5. Commit the transaction
    await client.query('COMMIT');
    console.log('Migration SUCCESS! Database schema created successfully.');

  } catch (error) {
    // 6. Rollback if any error occurred
    if (client) {
      await client.query('ROLLBACK');
      console.error('Migration FAILED! The transaction was rolled back.');
    }
    console.error(`Error during migration: ${error.message}`);
    // Exit the process with an error code
    process.exit(1);
  } finally {
    // 7. Release the client back to the pool
    if (client) {
      client.release();
    }
    // 8. Close the entire pool after the migration finishes
    await pool.end();
    console.log('Database connection pool closed.');
  }
}

// Execute the migration function
runMigrations();
