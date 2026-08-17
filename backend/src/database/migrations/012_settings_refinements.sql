-- Migration 012: Settings module refinements
-- Aligns system_settings/backup_records with the full Settings & System
-- Administration specification: adds is_sensitive/is_editable/created_at,
-- expands backup_type/status vocab with a notes field, and replaces the
-- placeholder seed data from migration 011 with the final key/category set.

-- --- system_settings: add missing columns -----------------------------
ALTER TABLE system_settings ADD COLUMN is_sensitive INTEGER NOT NULL DEFAULT 0;
ALTER TABLE system_settings ADD COLUMN is_editable INTEGER NOT NULL DEFAULT 1;
-- SQLite's ALTER TABLE ADD COLUMN does not allow a non-constant default
-- (e.g. datetime('now')), so add the column nullable and backfill it below.
ALTER TABLE system_settings ADD COLUMN created_at TEXT;
UPDATE system_settings SET created_at = updated_at WHERE created_at IS NULL;

-- --- backup_records: rebuild with notes + expanded enums ---------------
CREATE TABLE backup_records_new (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  filename       TEXT    NOT NULL,
  file_path      TEXT    NOT NULL,
  size_bytes     INTEGER,
  backup_type    TEXT    NOT NULL DEFAULT 'MANUAL'
                 CHECK (backup_type IN ('MANUAL', 'AUTOMATIC', 'PRE_UPDATE')),
  status         TEXT    NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  checksum       TEXT,
  error_message  TEXT,
  notes          TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at   TEXT,
  created_by     INTEGER REFERENCES users(id)
);

INSERT INTO backup_records_new
  (id, filename, file_path, size_bytes, backup_type, status, checksum, error_message, created_at, completed_at, created_by)
SELECT
  id, filename, file_path, size_bytes,
  CASE backup_type WHEN 'SCHEDULED' THEN 'AUTOMATIC' ELSE backup_type END,
  CASE status WHEN 'IN_PROGRESS' THEN 'PENDING' ELSE status END,
  checksum, error_message, created_at, completed_at, created_by
FROM backup_records;

DROP TABLE backup_records;
ALTER TABLE backup_records_new RENAME TO backup_records;

CREATE INDEX IF NOT EXISTS idx_backup_records_created_at ON backup_records(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);

-- --- Replace placeholder seed settings with the final key/category set -
DELETE FROM system_settings WHERE category IN ('ORGANIZATION', 'SECURITY', 'BACKUP', 'INVENTORY', 'REPORTS');

INSERT OR IGNORE INTO system_settings (category, key, value, value_type, description, is_sensitive, is_editable) VALUES
  ('ORGANIZATION', 'organization_name', 'Organization', 'STRING', 'Organization name shown across the application.', 0, 1),
  ('ORGANIZATION', 'department_name', 'Information Technology Department', 'STRING', 'Owning department name shown in reports and headers.', 0, 1),
  ('ORGANIZATION', 'system_name', 'IT Inventory System', 'STRING', 'Display name shown in the application header and reports.', 0, 1),
  ('ORGANIZATION', 'country', '', 'STRING', 'Country of operation.', 0, 1),
  ('ORGANIZATION', 'currency', 'USD', 'STRING', 'System currency code.', 0, 0),
  ('ORGANIZATION', 'currency_symbol', '$', 'STRING', 'System currency symbol.', 0, 0),
  ('ORGANIZATION', 'timezone', 'UTC', 'STRING', 'Timezone used for displaying dates and times.', 0, 1),
  ('ORGANIZATION', 'date_format', 'DD/MM/YYYY', 'STRING', 'Date format used throughout the application.', 0, 1),
  ('ORGANIZATION', 'time_format', '12_HOUR', 'STRING', 'Time format: 12_HOUR or 24_HOUR.', 0, 1),
  ('INVENTORY', 'asset_tag_prefix', 'ASSET', 'STRING', 'Prefix applied to newly generated asset tags.', 0, 1),
  ('INVENTORY', 'default_asset_status', 'IN_STOCK', 'STRING', 'Default status assigned to newly created assets.', 0, 1),
  ('INVENTORY', 'default_asset_condition', 'GOOD', 'STRING', 'Default condition assigned to newly created assets.', 0, 1),
  ('INVENTORY', 'warranty_warning_days', '30', 'NUMBER', 'Days before warranty expiry to surface a warning.', 0, 1),
  ('ASSIGNMENTS', 'default_assignment_days', '30', 'NUMBER', 'Default duration, in days, of a new asset assignment.', 0, 1),
  ('ASSIGNMENTS', 'overdue_warning_days', '3', 'NUMBER', 'Days past the expected return date before an assignment is flagged overdue.', 0, 1),
  ('MAINTENANCE', 'maintenance_number_prefix', 'MNT', 'STRING', 'Prefix applied to newly generated maintenance record numbers.', 0, 1),
  ('MAINTENANCE', 'repair_number_prefix', 'REP', 'STRING', 'Prefix applied to newly generated repair job numbers.', 0, 1),
  ('REPORTS', 'default_report_format', 'PDF_PRINT', 'STRING', 'Default export format offered on the reports page.', 0, 1),
  ('REPORTS', 'include_logo', 'true', 'BOOLEAN', 'Whether the organization logo is included in printed/exported reports.', 0, 1),
  ('REPORTS', 'include_footer', 'true', 'BOOLEAN', 'Whether the standard footer is included in printed/exported reports.', 0, 1),
  ('REPORTS', 'report_orientation', 'AUTO', 'STRING', 'Default page orientation for printed/exported reports: AUTO, PORTRAIT, or LANDSCAPE.', 0, 1),
  ('REPORTS', 'report_organization_name', 'Organization', 'STRING', 'Organization name shown on report headers.', 0, 1),
  ('REPORTS', 'report_confidentiality_footer', 'For internal use only.', 'STRING', 'Confidentiality footer text shown on printed/exported reports.', 0, 1),
  ('SECURITY', 'session_timeout_minutes', '480', 'NUMBER', 'Session timeout, in minutes, before a user must log in again.', 0, 1),
  ('SECURITY', 'max_failed_login_attempts', '5', 'NUMBER', 'Failed login attempts before an account is locked.', 0, 1),
  ('SECURITY', 'account_lock_minutes', '15', 'NUMBER', 'Lockout duration, in minutes, after exceeding failed login attempts.', 0, 1),
  ('SECURITY', 'require_password_change_after_reset', 'true', 'BOOLEAN', 'Whether users must change their password after an administrator reset.', 0, 1),
  ('SECURITY', 'allow_concurrent_sessions', 'true', 'BOOLEAN', 'Whether a user may hold more than one active session at a time.', 0, 1);

-- Backfill created_at for any row (pre-existing or freshly re-seeded) left NULL above.
UPDATE system_settings SET created_at = datetime('now') WHERE created_at IS NULL;
