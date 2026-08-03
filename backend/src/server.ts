import path from 'node:path';
import { createRequire } from 'node:module';
import { parseEnv } from './config';
import { getDb, runMigrations, closeDb } from './database';
import { createApp } from './app';

// Load .env from the repository root before anything else.
// tsx does not automatically load .env, so we do it manually here.
try {
  const require = createRequire(__filename);
  const dotenv = require('dotenv');
  const envPath = path.resolve(__dirname, '../../.env');
  dotenv.config({ path: envPath });
} catch {
  // dotenv is optional in production where env vars are set externally.
}

/**
 * Bootstrap the application.
 *
 * 1. Validate environment variables.
 * 2. Open the database connection.
 * 3. Run pending migrations.
 * 4. Start the HTTP server.
 */
function main(): void {
  const config = parseEnv();

  const db = getDb(config);

  const migrationsDir = path.resolve(__dirname, 'database/migrations');
  try {
    runMigrations(db, migrationsDir);
  } catch (err) {
    console.error('Migration failed. Aborting startup.');
    console.error(err);
    closeDb();
    process.exit(1);
  }

  const app = createApp(config);

  const server = app.listen(config.PORT, () => {
    console.log(
      `${config.APP_NAME} listening on http://localhost:${config.PORT}`,
    );
    console.log(`Environment: ${config.NODE_ENV}`);
  });

  // ---------------
  // Graceful shutdown
  // ---------------

  function shutdown(signal: string): void {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      closeDb();
      console.log('Database connection closed.');
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown hangs.
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ---------------
// Global error handling
// ---------------

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  closeDb();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  closeDb();
  process.exit(1);
});

main();