import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';

/** Shape of a row in the schema_migrations table. */
interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

/** Represents a migration file found on disk. */
interface MigrationFile {
  version: number;
  name: string;
  filePath: string;
}

/** Pattern for migration filenames: 001_description.sql */
const MIGRATION_FILE_RE = /^(\d{3})_(.+)\.sql$/;

/**
 * Reads migration files from the given directory, sorted by version ascending.
 *
 * @param migrationsDir - Absolute path to the migrations directory.
 * @returns Array of parsed migration files.
 */
function discoverMigrations(migrationsDir: string): MigrationFile[] {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const entries = fs.readdirSync(migrationsDir);
  const migrations: MigrationFile[] = [];

  for (const entry of entries) {
    const match = entry.match(MIGRATION_FILE_RE);
    if (!match) {
      continue;
    }
    const version = Number.parseInt(match[1]!, 10);
    const name = match[2]!;
    migrations.push({
      version,
      name,
      filePath: path.join(migrationsDir, entry),
    });
  }

  migrations.sort((a, b) => a.version - b.version);
  return migrations;
}

/**
 * Returns the set of migration versions already applied.
 *
 * @param db - The database connection.
 * @returns Set of applied version numbers.
 */
function getAppliedVersions(db: Database.Database): Set<number> {
  const applied = new Set<number>();

  // Ensure the tracking table exists before querying it.
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version   INTEGER PRIMARY KEY,
      name      TEXT    NOT NULL,
      applied_at TEXT   NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const rows = db
    .prepare('SELECT version FROM schema_migrations ORDER BY version')
    .all() as MigrationRecord[];

  for (const row of rows) {
    applied.add(row.version);
  }

  return applied;
}

/**
 * Applies all pending migrations in ascending version order.
 *
 * Each migration is executed inside its own transaction.
 * Migrations that have already been applied are skipped.
 * If any migration fails the runner throws immediately and
 * the caller should abort startup.
 *
 * @param db - The database connection.
 * @param migrationsDir - Absolute path to the migrations directory.
 */
export function runMigrations(
  db: Database.Database,
  migrationsDir: string,
): void {
  const migrations = discoverMigrations(migrationsDir);

  if (migrations.length === 0) {
    return;
  }

  const applied = getAppliedVersions(db);

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    const sql = fs.readFileSync(migration.filePath, 'utf-8');

    const run = db.transaction(() => {
      db.exec(sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
      ).run(migration.version, migration.name);
    });

    try {
      run();
    } catch (err) {
      throw new Error(
        `Migration ${String(migration.version).padStart(3, '0')}_${migration.name} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

/**
 * Prints the status of every known migration (applied / pending).
 * Used by the `database:status` script.
 *
 * @param db - The database connection.
 * @param migrationsDir - Absolute path to the migrations directory.
 */
export function printMigrationStatus(
  db: Database.Database,
  migrationsDir: string,
): void {
  const migrations = discoverMigrations(migrationsDir);
  const applied = getAppliedVersions(db);

  if (migrations.length === 0) {
    console.log('No migration files found.');
    return;
  }

  for (const migration of migrations) {
    const status = applied.has(migration.version) ? 'APPLIED' : 'PENDING';
    const versionLabel = String(migration.version).padStart(3, '0');
    console.log(`[${status}] ${versionLabel}_${migration.name}`);
  }
}