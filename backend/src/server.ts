import dotenv from 'dotenv';
import path from 'path';

// Load .env from the repository root before anything else.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createApp } from './app';
import { parseEnv } from './config/env';
import { getDb, runMigrations, closeDb } from './database';

const main = async () => {
  const config = parseEnv();

  const db = getDb(config);

  const migrationsDir = path.resolve(__dirname, 'database/migrations');
  try {
    await runMigrations(db, migrationsDir);
  } catch (err) {
    console.error('Migration failed. Aborting startup.');
    console.error(err);
    closeDb();
    process.exit(1);
  }

  const app = createApp(config);

  const server = app.listen(config.PORT, () => {
    console.log(`[${config.APP_NAME}] listening on http://localhost:${config.PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      closeDb();
      console.log('Database connection closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      closeDb();
      console.log('Database connection closed.');
      process.exit(0);
    });
  });

  // Global error handling
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
};

main();
