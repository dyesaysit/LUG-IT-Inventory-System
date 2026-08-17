import { PasswordSchema } from 'shared';
import { ZodError } from 'zod';
import type Database from 'better-sqlite3';
import type { EnvConfig } from '../config';
import { AppError } from '../middleware/errorHandler';
import type { PasswordService } from './PasswordService';

const countUsersSql = "SELECT COUNT(*) AS count FROM users WHERE archived_at IS NULL";
const findRoleSql = "SELECT id FROM roles WHERE code = 'SYSTEM_ADMINISTRATOR' AND archived_at IS NULL AND is_active = 1";

export async function ensureInitialAdministrator(
  db: Database.Database,
  config: EnvConfig,
  passwords: PasswordService,
): Promise<void> {
  const usersCount = (db.prepare(countUsersSql).get() as { count: number }).count;
  if (usersCount > 0) {
    console.log(
      'Initial administrator bootstrap skipped because a user account already exists. ' +
        'Changing INITIAL_ADMIN_USERNAME/EMAIL/PASSWORD does not update an existing account; ' +
        'run `npm run auth:reset-admin` in development to reset it.',
    );
    return;
  }

  if (!config.INITIAL_ADMIN_USERNAME || !config.INITIAL_ADMIN_PASSWORD) {
    console.log('No initial administrator credentials supplied. Starting in secure setup mode.');
    return;
  }

  try {
    PasswordSchema.parse(config.INITIAL_ADMIN_PASSWORD);
  } catch (error) {
    if (error instanceof ZodError && config.NODE_ENV !== 'production') {
      console.error(
        `INITIAL_ADMIN_PASSWORD validation failed: ${error.issues.map((issue) => issue.message).join(', ')}`,
      );
    }
    throw new AppError('Initial administrator password does not meet the required password policy.', 500);
  }

  const roleRow = db.prepare(findRoleSql).get() as { id: number } | undefined;
  if (!roleRow) {
    throw new AppError('SYSTEM_ADMINISTRATOR role is missing. Migration 010 may not have been applied.', 500);
  }

  const passwordHash = await passwords.hash(config.INITIAL_ADMIN_PASSWORD);

  db.prepare(
    `
      INSERT INTO users (
        person_id,
        username,
        email,
        password_hash,
        role_id,
        is_active,
        must_change_password,
        failed_login_attempts
      )
      VALUES (?, ?, ?, ?, ?, 1, 1, 0)
    `,
  ).run(null, config.INITIAL_ADMIN_USERNAME.trim(), config.INITIAL_ADMIN_EMAIL?.trim() || null, passwordHash, roleRow.id);

  console.log('Initial administrator account created. Password change is required at first login.');
}
