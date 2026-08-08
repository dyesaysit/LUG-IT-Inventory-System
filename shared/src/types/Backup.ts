/** How a backup was initiated. */
export type BackupType = 'MANUAL' | 'AUTOMATIC' | 'PRE_RESTORE' | 'PRE_UPDATE';

/** Lifecycle status of a backup record. */
export type BackupStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'VERIFIED' | 'CORRUPT';

/**
 * A recorded database backup. `filePath` and raw filesystem details are
 * intentionally omitted from the API-facing shape where not needed.
 */
export interface BackupRecord {
  id: number;
  filename: string;
  sizeBytes: number | null;
  backupType: BackupType;
  status: BackupStatus;
  checksum: string | null;
  errorMessage: string | null;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  createdBy: number | null;
  createdByName: string | null;
  verifiedAt: string | null;
  archivedAt: string | null;
}

export interface RestoreBackupResult {
  success: true;
  restartRequired: true;
  message: string;
}
