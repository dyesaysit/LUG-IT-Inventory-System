import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { BackupRecord, BackupType } from 'shared';
import type { EnvConfig } from '../config';
import { closeDb, getCurrentDb, getDb } from '../database/connection';
import { AppError } from '../middleware/errorHandler';
import type { IBackupRepository } from '../repositories/BackupRepository';
import { createBackupRepository } from '../repositories/BackupRepository';

/** Default backup storage directory: `<repo-root>/database/backups`. */
const defaultBackupDir = path.resolve(__dirname, '../../../database/backups');

/** Business logic for creating, listing, downloading, and restoring database backups. */
export interface IBackupService {
  listBackups(): Promise<BackupRecord[]>;
  createBackup(createdBy: number | null, backupType?: BackupType): Promise<BackupRecord>;
  getDownload(id: number): Promise<{ filePath: string; filename: string }>;
  verifyBackup(id: number): Promise<{ valid: boolean; checksum: string | null }>;
  restoreBackup(id: number, createdBy: number | null): Promise<void>;
  deleteBackup(id: number): Promise<void>;
  getLatestCompleted(): Promise<BackupRecord | null>;
}

export class BackupService implements IBackupService {
  private readonly backupDir: string;

  constructor(
    private readonly config: EnvConfig,
    private repository: IBackupRepository = createBackupRepository(),
  ) {
    this.backupDir = config.BACKUP_DIR ? path.resolve(config.BACKUP_DIR) : defaultBackupDir;
  }

  /** Guards against a tampered/relocated backup record pointing outside the managed backup directory. */
  private assertWithinBackupDir(filePath: string): void {
    const resolved = path.resolve(filePath);
    const relative = path.relative(this.backupDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new AppError('Backup file path is invalid.', 400);
    }
  }

  async listBackups(): Promise<BackupRecord[]> {
    return this.repository.listBackups();
  }

  async getLatestCompleted(): Promise<BackupRecord | null> {
    return this.repository.getLatestCompleted();
  }

  async createBackup(createdBy: number | null, backupType: BackupType = 'MANUAL'): Promise<BackupRecord> {
    fs.mkdirSync(this.backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `inventory-backup-${timestamp}.sqlite`;
    const filePath = path.join(this.backupDir, filename);

    const record = await this.repository.createBackupRecord(filename, filePath, backupType, createdBy);

    try {
      await getCurrentDb().backup(filePath);
      const stats = fs.statSync(filePath);
      const checksum = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
      await this.repository.completeBackupRecord(record.id, stats.size, checksum);
      const completed = await this.repository.getBackupById(record.id);
      return completed!;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown backup error';
      await this.repository.failBackupRecord(record.id, message);
      throw new AppError(`Backup failed: ${message}`, 500);
    }
  }

  async getDownload(id: number): Promise<{ filePath: string; filename: string }> {
    const backup = await this.repository.getBackupById(id);
    if (!backup || backup.status !== 'COMPLETED') {
      throw new AppError('Backup not found or not completed.', 404);
    }
    this.assertWithinBackupDir(backup.filePath);
    if (!fs.existsSync(backup.filePath)) {
      throw new AppError('Backup file is missing from disk.', 404);
    }
    return { filePath: backup.filePath, filename: backup.filename };
  }

  async verifyBackup(id: number): Promise<{ valid: boolean; checksum: string | null }> {
    const backup = await this.repository.getBackupById(id);
    if (!backup || backup.status !== 'COMPLETED') {
      throw new AppError('Backup not found or not completed.', 404);
    }
    this.assertWithinBackupDir(backup.filePath);
    if (!fs.existsSync(backup.filePath)) {
      throw new AppError('Backup file is missing from disk.', 404);
    }
    const actualChecksum = crypto.createHash('sha256').update(fs.readFileSync(backup.filePath)).digest('hex');
    const valid = actualChecksum === backup.checksum;
    if (!valid) {
      await this.repository.archiveBackupRecord(id, 'Checksum verification failed: file may be corrupt.');
    }
    return { valid, checksum: actualChecksum };
  }

  async restoreBackup(id: number, createdBy: number | null): Promise<void> {
    const backup = await this.repository.getBackupById(id);
    if (!backup || backup.status !== 'COMPLETED') {
      throw new AppError('Backup not found or not completed.', 404);
    }
    this.assertWithinBackupDir(backup.filePath);
    if (!fs.existsSync(backup.filePath)) {
      throw new AppError('Backup file is missing from disk.', 404);
    }
    const { valid } = await this.verifyBackup(id);
    if (!valid) {
      throw new AppError('Backup failed checksum verification and cannot be restored.', 400);
    }

    // Preserve the current state before overwriting it; a failed safety backup aborts the restore.
    let preUpdateBackup: BackupRecord;
    try {
      preUpdateBackup = await this.createBackup(createdBy, 'PRE_UPDATE');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown backup error';
      throw new AppError(`Restore aborted because the pre-restore backup failed: ${message}`, 500);
    }

    const dbPath = path.resolve(this.config.DATABASE_PATH);
    let restored = false;
    closeDb();
    try {
      fs.copyFileSync(backup.filePath, dbPath);
      for (const ext of ['-wal', '-shm']) {
        try {
          fs.unlinkSync(`${dbPath}${ext}`);
        } catch {
          // No stale WAL/SHM file present; nothing to remove.
        }
      }
      restored = true;
    } finally {
      getDb(this.config);
      this.repository = createBackupRepository();
    }

    if (restored) {
      const restoredPreUpdateRecord = await this.repository.createBackupRecord(
        preUpdateBackup.filename,
        path.join(this.backupDir, preUpdateBackup.filename),
        'PRE_UPDATE',
        createdBy,
      );
      await this.repository.completeBackupRecord(
        restoredPreUpdateRecord.id,
        preUpdateBackup.sizeBytes ?? 0,
        preUpdateBackup.checksum ?? '',
      );
    }
  }

  async deleteBackup(id: number): Promise<void> {
    const backup = await this.repository.getBackupById(id);
    if (!backup) {
      throw new AppError('Backup not found.', 404);
    }
    this.assertWithinBackupDir(backup.filePath);
    try {
      fs.unlinkSync(backup.filePath);
    } catch {
      // File already missing; still remove the database record.
    }
    await this.repository.delete(id);
  }
}

export const createBackupService = (config: EnvConfig, repository?: IBackupRepository): IBackupService =>
  new BackupService(config, repository);

