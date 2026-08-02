import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.resolve(__dirname, '../../../database');
const DB_PATH = path.join(DATA_DIR, 'inventory.db');

// Ensure the database directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

let db: Database.Database | null = null;

/**
 * Returns a singleton SQLite database connection.
 * Creates the database file if it does not already exist.
 */
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
  }

  return db;
}

/**
 * Close the database connection gracefully.
 * Should be called on application shutdown.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}