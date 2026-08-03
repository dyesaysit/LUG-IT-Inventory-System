import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import type { EnvConfig } from '../config';

let db: Database.Database | null = null;

/**
 * Opens and returns a singleton SQLite database connection.
 *
 * - Resolves `DATABASE_PATH` from the validated config.
 * - Creates the parent database directory when missing.
 * - Enables foreign keys, WAL mode, and busy timeout.
 * - Reuses the same connection for the entire application lifetime.
 *
 * @param config - Validated environment configuration.
 * @returns The application-wide SQLite database connection.
 */
export function getDb(config: EnvConfig): Database.Database {
  if (db) {
    return db;
  }

  const resolvedPath = path.resolve(config.DATABASE_PATH);
  const dir = path.dirname(resolvedPath);

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new Error(
      `Failed to create database directory "${dir}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    db = new Database(resolvedPath);
  } catch (err) {
    throw new Error(
      `Failed to open database at "${resolvedPath}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  return db;
}

/**
 * Returns the current database connection, or throws if not yet opened.
 *
 * @returns The active SQLite database connection.
 */
export function getCurrentDb(): Database.Database {
  if (!db) {
    throw new Error('Database connection has not been opened yet.');
  }
  return db;
}

/**
 * Closes the database connection gracefully.
 * Should be called on application shutdown.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}