import fs from 'node:fs';
import Database from 'better-sqlite3';
import { runMigrations, printMigrationStatus } from './migrate';
import path from 'node:path';

/**
 * Migration CLI runner entry point.
 *
 * Usage:
 *   tsx src/database/migration-runner.ts migrate
 *   tsx src/database/migration-runner.ts status
 *
 * Uses a temporary database connection independent of the application server
 * so these commands work standalone.
 */
function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || !['migrate', 'status'].includes(command)) {
    console.error(
      'Usage: tsx src/database/migration-runner.ts <migrate|status>',
    );
    process.exit(1);
  }

  const dbPath =
    process.env.DATABASE_PATH ??
    path.resolve(__dirname, '../../../database/inventory.sqlite');

  const resolvedPath = path.resolve(dbPath);
  const dir = path.dirname(resolvedPath);

  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(resolvedPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  const migrationsDir = path.resolve(__dirname, 'migrations');

  try {
    if (command === 'migrate') {
      runMigrations(db, migrationsDir);
      console.log('Migrations complete.');
    } else if (command === 'status') {
      printMigrationStatus(db, migrationsDir);
    }
  } finally {
    db.close();
  }
}

main();