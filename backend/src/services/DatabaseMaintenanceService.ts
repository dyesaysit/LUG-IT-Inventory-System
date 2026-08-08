import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseMaintenanceResult } from 'shared';
import type { EnvConfig } from '../config';
import { getCurrentDb } from '../database/connection';
import { AppError } from '../middleware/errorHandler';

/** Database file and health status shown on the Settings page. */
export interface DatabaseStatus {
  sizeBytes: number;
  pageCount: number;
  freelistCount: number;
  journalMode: string;
  walAutocheckpoint: number;
}

/** Business logic for read-only database status and maintenance operations. */
export interface IDatabaseMaintenanceService {
  getStatus(): Promise<DatabaseStatus>;
  runIntegrityCheck(): Promise<DatabaseMaintenanceResult>;
  runOptimize(): Promise<DatabaseMaintenanceResult>;
  runCheckpoint(): Promise<DatabaseMaintenanceResult>;
}

export class DatabaseMaintenanceService implements IDatabaseMaintenanceService {
  constructor(private readonly config: EnvConfig) {}

  async getStatus(): Promise<DatabaseStatus> {
    const db = getCurrentDb();
    const dbPath = path.resolve(this.config.DATABASE_PATH);
    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(dbPath).size;
    } catch {
      sizeBytes = 0;
    }
    const pageCount = (db.pragma('page_count', { simple: true }) as number) ?? 0;
    const freelistCount = (db.pragma('freelist_count', { simple: true }) as number) ?? 0;
    const journalMode = (db.pragma('journal_mode', { simple: true }) as string) ?? 'unknown';
    const walAutocheckpoint = (db.pragma('wal_autocheckpoint', { simple: true }) as number) ?? 0;
    return { sizeBytes, pageCount, freelistCount, journalMode, walAutocheckpoint };
  }

  async runIntegrityCheck(): Promise<DatabaseMaintenanceResult> {
    const db = getCurrentDb();
    try {
      const result = db.pragma('integrity_check', { simple: true }) as string;
      const success = result === 'ok';
      return {
        operation: 'INTEGRITY_CHECK',
        success,
        message: success ? 'Database integrity check passed.' : `Integrity check reported issues: ${result}`,
        ranAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new AppError(
        `Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  async runOptimize(): Promise<DatabaseMaintenanceResult> {
    const db = getCurrentDb();
    try {
      db.pragma('optimize');
      db.exec('VACUUM');
      return {
        operation: 'OPTIMIZE',
        success: true,
        message: 'Database optimized and vacuumed successfully.',
        ranAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new AppError(`Optimize failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  async runCheckpoint(): Promise<DatabaseMaintenanceResult> {
    const db = getCurrentDb();
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      return {
        operation: 'CHECKPOINT',
        success: true,
        message: 'Write-ahead log checkpointed successfully.',
        ranAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new AppError(`Checkpoint failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }
}

export const createDatabaseMaintenanceService = (config: EnvConfig): IDatabaseMaintenanceService =>
  new DatabaseMaintenanceService(config);
