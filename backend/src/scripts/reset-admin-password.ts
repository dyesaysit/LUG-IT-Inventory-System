import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from the repository root before anything else, same as server.ts.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PasswordSchema } from 'shared';
import { parseEnv } from '../config/env';
import { getDb, closeDb } from '../database/connection';
import { createUserRepository } from '../repositories/UserRepository';
import { createSessionRepository } from '../repositories/SessionRepository';
import { PasswordService } from '../services/PasswordService';

/**
 * Development-only CLI to reset the initial administrator's password when it
 * no longer matches INITIAL_ADMIN_PASSWORD (bootstrap only runs once and never
 * updates an existing account). Never logs the password or its hash.
 */
async function main(): Promise<void> {
  const config = parseEnv();

  if (config.NODE_ENV === 'production') {
    console.error('auth:reset-admin is a development-only command and cannot run when NODE_ENV=production.');
    process.exitCode = 1;
    return;
  }

  if (!config.INITIAL_ADMIN_PASSWORD) {
    console.error('Set INITIAL_ADMIN_PASSWORD in the environment before running auth:reset-admin.');
    process.exitCode = 1;
    return;
  }

  try {
    PasswordSchema.parse(config.INITIAL_ADMIN_PASSWORD);
  } catch {
    console.error('INITIAL_ADMIN_PASSWORD does not meet the required password policy. Nothing was changed.');
    process.exitCode = 1;
    return;
  }

  const db = getDb(config);
  const users = createUserRepository(db);
  const sessions = createSessionRepository(db);
  const passwords = new PasswordService();

  const identity = config.INITIAL_ADMIN_USERNAME || config.INITIAL_ADMIN_EMAIL;
  if (!identity) {
    console.error('Set INITIAL_ADMIN_USERNAME or INITIAL_ADMIN_EMAIL to identify the administrator account.');
    closeDb();
    process.exitCode = 1;
    return;
  }

  const user =
    (config.INITIAL_ADMIN_USERNAME ? await users.getUserByUsername(config.INITIAL_ADMIN_USERNAME) : null) ??
    (config.INITIAL_ADMIN_EMAIL ? await users.getUserByEmail(config.INITIAL_ADMIN_EMAIL) : null);

  if (!user) {
    console.error(`No existing user account found matching "${identity}". Nothing was changed.`);
    closeDb();
    process.exitCode = 1;
    return;
  }

  const passwordHash = await passwords.hash(config.INITIAL_ADMIN_PASSWORD);
  await users.updatePasswordHash(user.id, passwordHash, true);
  await users.resetFailedLoginAttempts(user.id);
  await sessions.revokeAllUserSessions(user.id);

  console.log(
    `Administrator account "${user.username}" (id ${user.id}) has been reset: password updated to match INITIAL_ADMIN_PASSWORD, ` +
      'account unlocked, a password change is required at next login, and all existing sessions were revoked.',
  );

  closeDb();
}

main().catch((err) => {
  console.error('Failed to reset administrator password:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
