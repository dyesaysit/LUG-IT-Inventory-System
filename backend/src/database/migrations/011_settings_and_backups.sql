-- Migration 011: Settings and System Administration module
-- Adds system_settings and backup_records tables, plus the additional
-- permissions the Settings module requires. Existing settings.view /
-- settings.manage / backups.view / backups.create / backups.restore
-- permissions (added in migration 010) are reused as-is and are not
-- redefined here.

CREATE TABLE IF NOT EXISTS system_settings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT    NOT NULL,
  key         TEXT    NOT NULL,
  value       TEXT    NOT NULL,
  value_type  TEXT    NOT NULL DEFAULT 'STRING'
              CHECK (value_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON')),
  description TEXT,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_by  INTEGER REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_category_key
  ON system_settings(category, key);

CREATE TABLE IF NOT EXISTS backup_records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  filename       TEXT    NOT NULL,
  file_path      TEXT    NOT NULL,
  size_bytes     INTEGER,
  backup_type    TEXT    NOT NULL DEFAULT 'MANUAL'
                 CHECK (backup_type IN ('MANUAL', 'SCHEDULED')),
  status         TEXT    NOT NULL DEFAULT 'IN_PROGRESS'
                 CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
  checksum       TEXT,
  error_message  TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at   TEXT,
  created_by     INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_backup_records_created_at ON backup_records(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);

-- New permissions required by the Settings and System Administration module.
-- settings.view and settings.manage already exist (migration 010) and are reused.
INSERT OR IGNORE INTO permissions (code, name, description, module) VALUES
  ('settings.security', 'Manage security settings', 'View and update authentication/security related settings.', 'settings'),
  ('settings.backup', 'Create and view backups', 'Create database backups and view backup history.', 'settings'),
  ('settings.restore', 'Restore backups', 'Restore the database from a backup.', 'settings'),
  ('settings.database', 'Database maintenance', 'Run database maintenance operations (integrity check, optimize, checkpoint).', 'settings'),
  ('settings.categories', 'Manage asset categories', 'Create, update, and deactivate asset categories.', 'settings'),
  ('settings.reports', 'Manage report defaults', 'Configure report presentation defaults.', 'settings');

-- SYSTEM_ADMINISTRATOR receives all new settings permissions.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'SYSTEM_ADMINISTRATOR'
  AND p.code IN (
    'settings.security', 'settings.backup', 'settings.restore',
    'settings.database', 'settings.categories', 'settings.reports'
  );

-- IT_MANAGER receives operational, non-security/non-backup settings access.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'IT_MANAGER'
  AND p.code IN ('settings.categories', 'settings.reports');

-- Default system settings. Uses INSERT OR IGNORE so re-running migrations
-- never overwrites a value an administrator has already configured.
INSERT OR IGNORE INTO system_settings (category, key, value, value_type, description) VALUES
  ('ORGANIZATION', 'appName', 'School IT Inventory System', 'STRING', 'Display name shown in the application header and reports.'),
  ('ORGANIZATION', 'supportEmail', '', 'STRING', 'Support contact email shown to users.'),
  ('ORGANIZATION', 'timezone', 'Africa/Accra', 'STRING', 'Timezone used for displaying dates and times.'),
  ('ORGANIZATION', 'currency', 'GHS', 'STRING', 'Fixed system currency (Ghanaian Cedi). Not user-changeable.'),
  ('SECURITY', 'maxFailedLoginAttempts', '5', 'NUMBER', 'Informational: failed attempts before an account is locked.'),
  ('SECURITY', 'lockoutDurationMinutes', '15', 'NUMBER', 'Informational: lockout duration after exceeding failed attempts.'),
  ('SECURITY', 'sessionHours', '8', 'NUMBER', 'Informational: default session duration in hours.'),
  ('SECURITY', 'sessionRememberDays', '14', 'NUMBER', 'Informational: "remember me" session duration in days.'),
  ('BACKUP', 'autoBackupEnabled', 'false', 'BOOLEAN', 'Whether scheduled automatic backups are enabled.'),
  ('BACKUP', 'retentionCount', '10', 'NUMBER', 'Number of backups to retain before older ones may be removed.'),
  ('INVENTORY', 'defaultAssetCondition', 'GOOD', 'STRING', 'Default condition assigned to newly created assets.'),
  ('INVENTORY', 'warrantyExpiryWarningDays', '30', 'NUMBER', 'Days before warranty expiry to surface a warning.'),
  ('REPORTS', 'includeLogoInReports', 'true', 'BOOLEAN', 'Whether the LUG logo is included in printed/exported reports.'),
  ('REPORTS', 'defaultExportFormat', 'PDF_PRINT', 'STRING', 'Default export format offered on the reports page.');
