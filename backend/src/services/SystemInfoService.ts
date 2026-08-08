import fs from 'node:fs';
import path from 'node:path';
import type { SystemInformation } from 'shared';
import type { EnvConfig } from '../config';
import { getCurrentDb } from '../database/connection';
import type { ISafeBackupService } from './SafeBackupService';
import type { ISettingsService } from './SettingsService';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const backendPackageJson = require('../../package.json') as { version?: string };

/** Gathers safe, non-sensitive system information for the Settings page. */
export interface ISystemInfoService {
  getSystemInformation(): Promise<SystemInformation>;
}

export class SystemInfoService implements ISystemInfoService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly config: EnvConfig,
    private readonly backupService: Pick<ISafeBackupService, 'getLatestCompleted'>,
    private readonly settingsService: ISettingsService,
  ) {}

  async getSystemInformation(): Promise<SystemInformation> {
    const db = getCurrentDb();
    const dbPath = path.resolve(this.config.DATABASE_PATH);

    let databaseSizeBytes = 0;
    try {
      databaseSizeBytes = fs.statSync(dbPath).size;
    } catch {
      databaseSizeBytes = 0;
    }

    let lastMigration: string | null = null;
    try {
      const row = db
        .prepare('SELECT name FROM schema_migrations ORDER BY version DESC LIMIT 1')
        .get() as { name: string } | undefined;
      lastMigration = row?.name ?? null;
    } catch {
      lastMigration = null;
    }

    const totalUsersRow = db
      .prepare('SELECT COUNT(*) as count FROM users WHERE archived_at IS NULL')
      .get() as { count: number };

    const activeSessionsRow = db
      .prepare("SELECT COUNT(*) as count FROM user_sessions WHERE revoked_at IS NULL AND expires_at > datetime('now')")
      .get() as { count: number };

    const latestBackup = await this.backupService.getLatestCompleted();

    const sqliteVersionRow = db.prepare('SELECT sqlite_version() as version').get() as { version: string };

    const organizationSettings = await this.settingsService.getByCategory('ORGANIZATION');
    const currentTimezone = organizationSettings.find((setting) => setting.key === 'timezone')?.value ?? 'unknown';
    const currentCurrency = organizationSettings.find((setting) => setting.key === 'currency')?.value ?? 'unknown';

    return {
      appName: this.config.APP_NAME,
      appVersion: backendPackageJson.version ?? 'unknown',
      environment: this.config.NODE_ENV,
      nodeVersion: process.version,
      sqliteVersion: sqliteVersionRow.version,
      databaseSizeBytes,
      lastMigration,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      totalUsers: totalUsersRow.count,
      activeSessions: activeSessionsRow.count,
      lastBackupAt: latestBackup?.completedAt ?? null,
      currentTimezone,
      currentCurrency,
      serverTime: new Date().toISOString(),
    };
  }
}

export const createSystemInfoService = (
  config: EnvConfig,
  backupService: Pick<ISafeBackupService, 'getLatestCompleted'>,
  settingsService: ISettingsService,
): ISystemInfoService => new SystemInfoService(config, backupService, settingsService);

