-- Migration 015: safe backup/restore lifecycle and granular permissions.
CREATE TABLE backup_records_hardened (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes INTEGER,
  backup_type TEXT NOT NULL DEFAULT 'MANUAL' CHECK (backup_type IN ('MANUAL','AUTOMATIC','PRE_RESTORE','PRE_UPDATE')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','FAILED','VERIFIED','CORRUPT')),
  checksum TEXT,
  error_message TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  verified_at TEXT,
  created_by INTEGER REFERENCES users(id),
  archived_at TEXT
);
INSERT INTO backup_records_hardened (id,filename,file_path,size_bytes,backup_type,status,checksum,error_message,notes,created_at,completed_at,created_by)
SELECT id,filename,file_path,size_bytes,backup_type,status,checksum,error_message,notes,created_at,completed_at,created_by FROM backup_records;
DROP TABLE backup_records;
ALTER TABLE backup_records_hardened RENAME TO backup_records;
CREATE INDEX idx_backup_records_created_at ON backup_records(created_at);
CREATE INDEX idx_backup_records_status ON backup_records(status);
CREATE INDEX idx_backup_records_archived_at ON backup_records(archived_at);

INSERT OR IGNORE INTO permissions (code,name,description,module) VALUES
 ('settings.backup.view','View backups','View backup history.','settings'),
 ('settings.backup.create','Create backups','Create manual database backups.','settings'),
 ('settings.backup.download','Download backups','Download completed database backups.','settings'),
 ('settings.backup.verify','Verify backups','Verify backup checksum and database integrity.','settings'),
 ('settings.backup.restore','Restore backups','Stage a verified database restore.','settings'),
 ('settings.backup.archive','Archive backups','Archive backup files and metadata.','settings');
INSERT OR IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p WHERE r.code='SYSTEM_ADMINISTRATOR' AND p.code LIKE 'settings.backup.%';
