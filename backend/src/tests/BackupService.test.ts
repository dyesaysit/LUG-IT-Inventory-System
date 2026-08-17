import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler';
import { closeDb, getDb } from '../database/connection';
import { BackupRepository } from '../repositories/BackupRepository';
import { SafeBackupService, applyPendingRestore, finalizePendingRestore } from '../services/SafeBackupService';
import { ensureSecretKey, resolveSecretKeyPath } from '../services/SecretService';
import type { EnvConfig } from '../config';

const sql = (name: string) => fs.readFileSync(path.resolve(__dirname, `../database/migrations/${name}`), 'utf8');

/** Creates an isolated temp directory with a real SQLite file (backups require a real file, not :memory:). */
const setup = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-service-test-'));
  const dbPath = path.join(tempDir, 'test.sqlite');
  const backupDir = path.join(tempDir, 'backups');

  const config: EnvConfig = {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_PATH: dbPath,
    LOG_LEVEL: 'silent',
    APP_NAME: 'Test App',
    SESSION_COOKIE_NAME: 'test_session',
    SESSION_HOURS: 8,
    SESSION_REMEMBER_DAYS: 14,
    BACKUP_DIRECTORY: backupDir,
    APPLICATION_DATA_DIR: path.join(tempDir, 'application-data'),
  };

  const db = getDb(config);
  db.exec("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL DEFAULT (datetime('now')))");
  for (const name of ['002_assets.sql', '010_authentication.sql', '011_settings_and_backups.sql', '012_settings_refinements.sql', '015_backup_restore_hardening.sql']) {
    db.exec(sql(name));
  }

  const service = new SafeBackupService(config, new BackupRepository(db));
  ensureSecretKey(config);
  return { tempDir, config, service };
};

const teardown = (tempDir: string) => {
  closeDb();
  fs.rmSync(tempDir, { recursive: true, force: true });
};

describe('BackupService', { concurrency: false }, () => {
  it('creates a completed backup with a checksum and non-zero size', async () => {
    const { tempDir, service } = setup();
    const backup = await service.createBackup(null);
    assert.equal(backup.status, 'COMPLETED');
    assert.ok(backup.sizeBytes && backup.sizeBytes > 0);
    assert.ok(backup.checksum && backup.checksum.length === 64);
    teardown(tempDir);
  });

  it('lists created backups', async () => {
    const { tempDir, service } = setup();
    await service.createBackup(null);
    const backups = await service.listBackups();
    assert.equal(backups.length, 1);
    teardown(tempDir);
  });

  it('resolves a download path for a completed backup', async () => {
    const { tempDir, service } = setup();
    const backup = await service.createBackup(null);
    const download = await service.getDownload(backup.id);
    assert.ok(fs.existsSync(download.filePath));
    teardown(tempDir);
  });

  it('saves new backups to an administrator-selected directory', async () => {
    const { tempDir, service } = setup();
    const externalDirectory = path.join(tempDir, 'mounted-backup-device');
    const storage = await service.setStorage(externalDirectory);
    const backup = await service.createBackup(null);
    const download = await service.getDownload(backup.id);
    assert.equal(storage.directory, path.resolve(externalDirectory));
    assert.equal(path.dirname(download.filePath), path.resolve(externalDirectory));
    teardown(tempDir);
  });

  it('imports and validates a selected portable backup file', async () => {
    const { tempDir, service } = setup();
    const source = await service.createBackup(null);
    const sourceFile = await service.getDownload(source.id);
    const imported = await service.importBackup(fs.readFileSync(sourceFile.filePath), source.filename, null);
    assert.equal(imported.status, 'COMPLETED');
    assert.match(imported.filename, /^imported-/);
    assert.equal((await service.verifyBackup(imported.id)).valid, true);
    teardown(tempDir);
  });

  it('rejects an uploaded file that is not an inventory backup', async () => {
    const { tempDir, service } = setup();
    await assert.rejects(service.importBackup(Buffer.alloc(2048, 1), 'fake.sqlite', null));
    teardown(tempDir);
  });

  it('embeds the encryption key in a portable backup', async () => {
    const { tempDir, service } = setup();
    const backup = await service.createBackup(null);
    const download = await service.getDownload(backup.id);
    const backupDb = new Database(download.filePath, { readonly: true });
    const row = backupDb.prepare("SELECT value FROM portable_backup_secrets WHERE name='email_encryption_key'").get() as { value: Buffer };
    backupDb.close();
    assert.equal(row.value.length, 32);
    teardown(tempDir);
  });

  it('verifies a completed backup checksum', async () => {
    const { tempDir, service } = setup();
    const backup = await service.createBackup(null);
    const verification = await service.verifyBackup(backup.id);
    assert.equal(verification.valid, true);
    assert.equal(verification.checksum, backup.checksum);
    teardown(tempDir);
  });

  it('rejects restoring a corrupt backup', async () => {
    const { tempDir, service } = setup();
    const backup = await service.createBackup(null);
    const download = await service.getDownload(backup.id);
    fs.appendFileSync(download.filePath, 'corrupt');
    const verification = await service.verifyBackup(backup.id);
    assert.equal(verification.valid, false);
    await assert.rejects(
      service.restoreBackup(backup.id, null),
      (error: unknown) => error instanceof AppError && [400,404].includes(error.statusCode),
    );
    teardown(tempDir);
  });

  it('rejects downloading a non-existent backup', async () => {
    const { tempDir, service } = setup();
    await assert.rejects(
      service.getDownload(9999),
      (error: unknown) => error instanceof AppError && error.statusCode === 404,
    );
    teardown(tempDir);
  });

  it('stages restore and applies it safely on restart', async () => {
    const { tempDir, service, config } = setup();
    const backup = await service.createBackup(null);
    const result=await service.restoreBackup(backup.id, null);
    assert.equal(result.restartRequired,true);
    const originalKey = fs.readFileSync(resolveSecretKeyPath(config));
    fs.writeFileSync(resolveSecretKeyPath(config), Buffer.alloc(32, 7));
    closeDb();
    const marker=applyPendingRestore(config);
    assert.deepEqual(fs.readFileSync(resolveSecretKeyPath(config)), originalKey);
    const db = getDb(config);
    finalizePendingRestore(config,db,marker);
    const row = db.prepare('SELECT COUNT(*) as count FROM backup_records').get() as { count: number };
    assert.ok(row.count >= 2);
    const safetyBackup = db
      .prepare("SELECT COUNT(*) as count FROM backup_records WHERE backup_type = 'PRE_RESTORE'")
      .get() as { count: number };
    assert.equal(safetyBackup.count, 1);
    assert.equal(fs.readdirSync(path.join(tempDir, 'backups')).filter((name) => name.endsWith('.sqlite')).length, 2);
    teardown(tempDir);
  });

  it('rejects a backup record whose file path escapes the backup directory', async () => {
    const { tempDir, service, config } = setup();
    const db = getDb(config);
    const outsidePath = path.join(tempDir, 'outside.sqlite');
    fs.writeFileSync(outsidePath, 'not a database');
    const inserted = db
      .prepare(
        `INSERT INTO backup_records (filename, file_path, backup_type, status, checksum)
         VALUES ('outside.sqlite', ?, 'MANUAL', 'COMPLETED', 'checksum')`,
      )
      .run(outsidePath);
    await assert.rejects(
      service.getDownload(Number(inserted.lastInsertRowid)),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
    teardown(tempDir);
  });

  it('archives a backup record and its file', async () => {
    const { tempDir, service } = setup();
    const backup = await service.createBackup(null);
    await service.archiveBackup(backup.id);
    await assert.rejects(service.getDownload(backup.id));
    teardown(tempDir);
  });
});
