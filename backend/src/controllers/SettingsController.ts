import type {
  BatchUpdateSettingsInput,
  RestoreBackupInput,
  SettingsByCategory,
  SystemInformation,
  SystemSetting,
  UpdateSettingInput,
} from 'shared';
import type { DatabaseMaintenanceResult } from 'shared';
import type { BackupRecord } from 'shared';
import type { ISettingsService } from '../services/SettingsService';
import type { ISystemInfoService } from '../services/SystemInfoService';
import type { IDatabaseMaintenanceService, DatabaseStatus } from '../services/DatabaseMaintenanceService';
import type { ISafeBackupService } from '../services/SafeBackupService';
import { recordAudit } from '../services/audit-event';

/** Controller for the Settings and System Administration module. */
export class SettingsController {
  constructor(
    private readonly settingsService: ISettingsService,
    private readonly systemInfoService: ISystemInfoService,
    private readonly databaseService: IDatabaseMaintenanceService,
  ) {}

  async getAll(): Promise<SettingsByCategory> {
    return this.settingsService.getAll();
  }

  async getByCategory(category: string): Promise<SystemSetting[]> {
    return this.settingsService.getByCategory(category);
  }

  async updateSetting(
    category: string,
    key: string,
    input: UpdateSettingInput,
    updatedBy: number | null,
  ): Promise<ReturnType<ISettingsService['updateSetting']>> {
    const updated = await this.settingsService.updateSetting(category, key, input.value, updatedBy);
    await recordAudit('SYSTEM', null, 'UPDATE', `Updated setting ${category}.${key}`, null, updated);
    return updated;
  }

  async updateSettingsBatch(input: BatchUpdateSettingsInput, updatedBy: number | null): Promise<SystemSetting[]> {
    const updated = await this.settingsService.updateSettingsBatch(input.updates, updatedBy);
    const categories = [...new Set(input.updates.map((update) => update.category))].join(', ');
    await recordAudit('SYSTEM', null, 'UPDATE', `Updated settings in categories: ${categories}`, null, null);
    return updated;
  }

  async getSystemInformation(): Promise<SystemInformation> {
    return this.systemInfoService.getSystemInformation();
  }

  async getDatabaseStatus(): Promise<DatabaseStatus> {
    return this.databaseService.getStatus();
  }

  async runIntegrityCheck(): Promise<DatabaseMaintenanceResult> {
    return this.databaseService.runIntegrityCheck();
  }

  async runOptimize(): Promise<DatabaseMaintenanceResult> {
    return this.databaseService.runOptimize();
  }

  async runCheckpoint(): Promise<DatabaseMaintenanceResult> {
    return this.databaseService.runCheckpoint();
  }
}

/** Controller for backup creation, listing, download, verification, and restore. */
export class BackupController {
  constructor(private readonly backupService: ISafeBackupService) {}

  async list(): Promise<BackupRecord[]> {
    return this.backupService.listBackups();
  }

  async get(id: number): Promise<BackupRecord> { return this.backupService.getBackup(id); }

  async create(createdBy: number | null): Promise<BackupRecord> {
    const backup = await this.backupService.createBackup(createdBy);
    await recordAudit('SYSTEM', null, 'CREATE', `Created database backup ${backup.filename}`, null, backup);
    return backup;
  }

  async getDownload(id: number): Promise<{ filePath: string; filename: string }> {
    return this.backupService.getDownload(id);
  }

  async verify(id: number): Promise<{ valid: boolean; checksum: string | null }> {
    const result = await this.backupService.verifyBackup(id);
    await recordAudit(
      'SYSTEM',
      id,
      'UPDATE',
      `Verified backup ${id}: ${result.valid ? 'checksum matches' : 'checksum mismatch'}`,
      null,
      null,
    );
    return result;
  }

  async restore(id: number, _input: RestoreBackupInput, createdBy: number | null) {
    const result = await this.backupService.restoreBackup(id, createdBy);
    await recordAudit('SYSTEM', id, 'RESTORE', `Staged database restore from backup ${id}; restart required`, null, null);
    return result;
  }

  async remove(id: number): Promise<void> {
    await this.backupService.archiveBackup(id);
    await recordAudit('SYSTEM', id, 'ARCHIVE', `Archived backup ${id}`, null, null);
  }
}

