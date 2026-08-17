import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'path';

// Load .env from the repository root before anything else.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createApp } from './app';
import { parseEnv } from './config/env';
import { getDb, runMigrations, closeDb } from './database';
import { recordAudit } from './services/audit-event';
import { ensureInitialAdministrator } from './services/AuthBootstrapService';
import { PasswordService } from './services/PasswordService';
import { createUserRepository } from './repositories/UserRepository';
import { createRoleRepository } from './repositories/RoleRepository';
import { createSessionRepository } from './repositories/SessionRepository';
import { createAuditRepository } from './repositories/AuditRepository';
import { AuditService } from './services/AuditService';
import { AuthService } from './services/AuthService';
import { applyPendingRestore, finalizePendingRestore } from './services/SafeBackupService';

const main = async () => {
  const config = parseEnv();

  const pendingRestore = applyPendingRestore(config);
  const db = getDb(config);

  const compiledMigrationsDir = path.resolve(__dirname, 'database/migrations');
  const migrationsDir = fs.existsSync(compiledMigrationsDir)
    ? compiledMigrationsDir
    : path.resolve(__dirname, '../src/database/migrations');
  try {
    await runMigrations(db, migrationsDir);
    finalizePendingRestore(config, db, pendingRestore);
  } catch (err) {
    console.error('Migration failed. Aborting startup.');
    console.error(err);
    closeDb();
    process.exit(1);
  }

  const passwordService = new PasswordService();
  await ensureInitialAdministrator(db, config, passwordService);

  const startupAuthService = new AuthService(
    createUserRepository(),
    createRoleRepository(),
    createSessionRepository(),
    passwordService,
    new AuditService(createAuditRepository()),
  );
  await startupAuthService.cleanupExpiredSessions();

  const app = createApp(config);

  const host = process.env.HOST ?? '127.0.0.1';
  const server = app.listen(config.PORT, host, () => {
    console.log(`[${config.APP_NAME}] listening on http://${host}:${config.PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
    void recordAudit('SYSTEM',null,'START','Application started');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    server.close(async () => {
      console.log('HTTP server closed.');
      await recordAudit('SYSTEM',null,'LOGOUT','Application shut down');closeDb();
      console.log('Database connection closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    server.close(async () => {
      console.log('HTTP server closed.');
      await recordAudit('SYSTEM',null,'LOGOUT','Application shut down');closeDb();
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
