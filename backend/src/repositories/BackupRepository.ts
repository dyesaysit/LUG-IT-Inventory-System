import type Database from 'better-sqlite3';
import type { BackupRecord, BackupStatus, BackupType } from 'shared';
import { getCurrentDb } from '../database/connection';

interface BackupRow {
  id: number;
  filename: string;
  file_path: string;
  size_bytes: number | null;
  backup_type: string;
  status: string;
  checksum: string | null;
  error_message: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  created_by: number | null;
  created_by_name: string | null;
  verified_at: string | null;
  archived_at: string | null;
}

const mapBackup = (row: BackupRow): BackupRecord => ({
  id: row.id,
  filename: row.filename,
  sizeBytes: row.size_bytes,
  backupType: row.backup_type as BackupType,
  status: row.status as BackupStatus,
  checksum: row.checksum,
  errorMessage: row.error_message,
  notes: row.notes,
  createdAt: row.created_at,
  completedAt: row.completed_at,
  createdBy: row.created_by,
  createdByName: row.created_by_name,
  verifiedAt: row.verified_at,
  archivedAt: row.archived_at,
});

/** Internal row shape exposing the filesystem path, used only within the backend. */
export interface BackupRecordWithPath extends BackupRecord {
  filePath: string;
}

/** Persistence contract for backup records. */
export interface IBackupRepository {
  listBackups(): Promise<BackupRecord[]>;
  getBackupById(id: number): Promise<BackupRecordWithPath | null>;
  createBackupRecord(
    filename: string,
    filePath: string,
    backupType: BackupType,
    createdBy: number | null,
  ): Promise<BackupRecordWithPath>;
  completeBackupRecord(id: number, sizeBytes: number, checksum: string): Promise<void>;
  setCreatedAt(id: number, createdAt: string): Promise<void>;
  failBackupRecord(id: number, errorMessage: string): Promise<void>;
  archiveBackupRecord(id: number, notes: string): Promise<void>;
  markVerification(id: number, valid: boolean, notes: string | null): Promise<void>;
  delete(id: number): Promise<void>;
  getLatestCompleted(): Promise<BackupRecord | null>;
}

/** Prepared-statement SQLite repository for backup records. */
export class BackupRepository implements IBackupRepository {
  private readonly select = `SELECT b.*,u.username created_by_name FROM backup_records b LEFT JOIN users u ON u.id=b.created_by`;
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  private mapWithPath(row: BackupRow): BackupRecordWithPath {
    return { ...mapBackup(row), filePath: row.file_path };
  }

  async listBackups(): Promise<BackupRecord[]> {
    const rows = this.db
      .prepare(`${this.select} WHERE b.archived_at IS NULL ORDER BY b.created_at DESC`)
      .all() as BackupRow[];
    return rows.map(mapBackup);
  }

  async getBackupById(id: number): Promise<BackupRecordWithPath | null> {
    const row = this.db.prepare(`${this.select} WHERE b.id = ? AND b.archived_at IS NULL`).get(id) as BackupRow | undefined;
    return row ? this.mapWithPath(row) : null;
  }

  async createBackupRecord(
    filename: string,
    filePath: string,
    backupType: BackupType,
    createdBy: number | null,
  ): Promise<BackupRecordWithPath> {
    const result = this.db
      .prepare(
        `INSERT INTO backup_records (filename, file_path, backup_type, status, created_by)
         VALUES (@filename, @filePath, @backupType, 'PENDING', @createdBy)`,
      )
      .run({ filename, filePath, backupType, createdBy });
    const created = await this.getBackupById(Number(result.lastInsertRowid));
    if (!created) {
      throw new Error('Failed to load backup record after creation');
    }
    return created;
  }

  async completeBackupRecord(id: number, sizeBytes: number, checksum: string): Promise<void> {
    this.db
      .prepare(
        `UPDATE backup_records
         SET status = 'COMPLETED', size_bytes = @sizeBytes, checksum = @checksum, completed_at = datetime('now')
         WHERE id = @id`,
      )
      .run({ id, sizeBytes, checksum });
  }

  async failBackupRecord(id: number, errorMessage: string): Promise<void> {
    this.db
      .prepare(
        `UPDATE backup_records
         SET status = 'FAILED', error_message = @errorMessage, completed_at = datetime('now')
         WHERE id = @id`,
      )
      .run({ id, errorMessage });
  }

  async archiveBackupRecord(id: number, notes: string): Promise<void> {
    this.db.prepare(`UPDATE backup_records SET notes = @notes, archived_at = datetime('now') WHERE id = @id`).run({ id, notes });
  }

  async setCreatedAt(id: number, createdAt: string): Promise<void> {
    this.db.prepare('UPDATE backup_records SET created_at = ? WHERE id = ?').run(createdAt, id);
  }

  async markVerification(id: number, valid: boolean, notes: string | null): Promise<void> {
    this.db.prepare(`UPDATE backup_records SET status=@status,verified_at=datetime('now'),notes=COALESCE(@notes,notes) WHERE id=@id`).run({ id, status: valid ? 'VERIFIED' : 'CORRUPT', notes });
  }

  async delete(id: number): Promise<void> { await this.archiveBackupRecord(id, 'Archived.'); }

  async getLatestCompleted(): Promise<BackupRecord | null> {
    const row = this.db
      .prepare(`${this.select} WHERE b.status IN ('COMPLETED','VERIFIED') AND b.archived_at IS NULL ORDER BY b.completed_at DESC LIMIT 1`)
      .get() as BackupRow | undefined;
    return row ? mapBackup(row) : null;
  }
}

export const createBackupRepository = (db?: Database.Database): IBackupRepository => new BackupRepository(db);
