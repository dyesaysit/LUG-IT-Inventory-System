import type Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { InitialSetupInputSchema } from 'shared';
import type { InitialSetupInput, InitialSetupStatus } from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { PasswordService } from './PasswordService';

const activeAdministratorSql = `
  SELECT COUNT(*) AS count
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE r.code = 'SYSTEM_ADMINISTRATOR'
    AND u.is_active = 1
    AND u.archived_at IS NULL
`;

/** Manages the one-time initial administrator setup state. */
export class InitialSetupService {
  constructor(
    private readonly db: Database.Database,
    private readonly passwords: PasswordService,
  ) {}

  /** Returns whether the installation still requires an administrator. */
  getStatus(): InitialSetupStatus {
    const row = this.db.prepare(activeAdministratorSql).get() as { count: number };
    return { setupRequired: row.count === 0 };
  }

  /** Creates the first administrator exactly once. */
  async complete(input: InitialSetupInput): Promise<void> {
    const parsed = InitialSetupInputSchema.parse(input);
    const passwordHash = await this.passwords.hash(parsed.password);
    const logo = parsed.logoDataUrl ? this.saveLogo(parsed.logoDataUrl) : null;
    const createAdministrator = this.db.transaction(() => {
      if (!this.getStatus().setupRequired) {
        throw new AppError('Initial administrator setup has already been completed.', 409);
      }
      const role = this.db
        .prepare("SELECT id FROM roles WHERE code = 'SYSTEM_ADMINISTRATOR' AND is_active = 1 AND archived_at IS NULL")
        .get() as { id: number } | undefined;
      if (!role) {
        throw new AppError('System Administrator role is unavailable.', 500);
      }
      const duplicate = this.db
        .prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND archived_at IS NULL')
        .get(parsed.username) as { id: number } | undefined;
      if (duplicate) {
        throw new AppError('Username already exists.', 409);
      }
      this.db
        .prepare(`
          INSERT INTO users (
            person_id, username, email, password_hash, role_id,
            is_active, must_change_password, failed_login_attempts
          ) VALUES (NULL, ?, NULL, ?, ?, 1, 0, 0)
        `)
        .run(parsed.username, passwordHash, role.id);
      const update = this.db.prepare("UPDATE system_settings SET value=?,updated_at=datetime('now') WHERE category='ORGANIZATION' AND key=?");
      update.run(parsed.systemName, 'system_name');
      update.run(parsed.systemName, 'appName');
      update.run(parsed.institutionName, 'organization_name');
      update.run(parsed.institutionShortName.toUpperCase(), 'organization_short_name');
      if (logo) update.run(logo, 'logo_path');
      this.db.prepare("UPDATE system_settings SET value=?,updated_at=datetime('now') WHERE category='REPORTS' AND key='report_organization_name'").run(parsed.institutionName);
    });
    createAdministrator();
  }

  private saveLogo(dataUrl: string): string {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) throw new AppError('Logo must be a PNG, JPEG, or WebP image.', 400);
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length < 8 || buffer.length > 2 * 1024 * 1024) throw new AppError('Logo must be smaller than 2 MB.', 400);
    const extension = match[1] === 'image/jpeg' ? '.jpg' : match[1] === 'image/webp' ? '.webp' : '.png';
    const dataDir = process.env.APPLICATION_DATA_DIR ?? path.join(process.env.PROGRAMDATA ?? process.env.LOCALAPPDATA ?? os.homedir(), 'IT-Inventory-Server');
    const brandingDir = path.resolve(dataDir, 'branding');
    fs.mkdirSync(brandingDir, { recursive: true });
    const filename = `logo-initial-${Date.now()}${extension}`;
    fs.writeFileSync(path.join(brandingDir, filename), buffer, { mode: 0o600 });
    return `/api/settings/branding/logo/${filename}`;
  }
}
