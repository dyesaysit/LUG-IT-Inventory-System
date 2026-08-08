-- Migration 010: Authentication and RBAC

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id),
  permission_id INTEGER NOT NULL REFERENCES permissions(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER REFERENCES people(id),
  username TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0, 1)),
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  password_changed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase_unique
  ON users(username COLLATE NOCASE)
  WHERE archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase_unique
  ON users(email COLLATE NOCASE)
  WHERE email IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_person_id ON users(person_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_users_archived_at ON users(archived_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token_hash_unique ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked_at ON user_sessions(revoked_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_token_hash_unique ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_used_at ON password_reset_tokens(used_at);

INSERT OR IGNORE INTO roles (code, name, description, is_system, is_active) VALUES
  ('SYSTEM_ADMINISTRATOR', 'System Administrator', 'Full system administration and operational control.', 1, 1),
  ('IT_MANAGER', 'IT Manager', 'Operational management, reporting, and user oversight.', 1, 1),
  ('IT_OFFICER', 'IT Officer', 'Operational module management for daily IT inventory work.', 1, 1),
  ('AUDITOR', 'Auditor', 'Read-only access to operations, reports, and audit review.', 1, 1),
  ('READ_ONLY', 'Read-only User', 'Read-only access to approved operational pages and reports.', 1, 1);

INSERT OR IGNORE INTO permissions (code, name, description, module) VALUES
  ('dashboard.view', 'View dashboard', 'View dashboard and summary information.', 'dashboard'),
  ('assets.view', 'View assets', 'View assets and asset details.', 'assets'),
  ('assets.create', 'Create assets', 'Create assets.', 'assets'),
  ('assets.update', 'Update assets', 'Update assets.', 'assets'),
  ('assets.archive', 'Archive assets', 'Archive assets.', 'assets'),
  ('departments.view', 'View departments', 'View departments.', 'departments'),
  ('departments.create', 'Create departments', 'Create departments.', 'departments'),
  ('departments.update', 'Update departments', 'Update departments.', 'departments'),
  ('departments.archive', 'Archive departments', 'Archive departments.', 'departments'),
  ('people.view', 'View people', 'View people.', 'people'),
  ('people.create', 'Create people', 'Create people.', 'people'),
  ('people.update', 'Update people', 'Update people.', 'people'),
  ('people.archive', 'Archive people', 'Archive people.', 'people'),
  ('locations.view', 'View locations', 'View locations.', 'locations'),
  ('locations.create', 'Create locations', 'Create locations.', 'locations'),
  ('locations.update', 'Update locations', 'Update locations.', 'locations'),
  ('locations.archive', 'Archive locations', 'Archive locations.', 'locations'),
  ('assignments.view', 'View assignments', 'View assignments.', 'assignments'),
  ('assignments.create', 'Create assignments', 'Create assignments.', 'assignments'),
  ('assignments.update', 'Update assignments', 'Update assignments.', 'assignments'),
  ('assignments.return', 'Return assignments', 'Return assignments.', 'assignments'),
  ('assignments.cancel', 'Cancel assignments', 'Cancel assignments.', 'assignments'),
  ('maintenance.view', 'View maintenance', 'View maintenance.', 'maintenance'),
  ('maintenance.create', 'Create maintenance', 'Create maintenance.', 'maintenance'),
  ('maintenance.update', 'Update maintenance', 'Update maintenance.', 'maintenance'),
  ('maintenance.start', 'Start maintenance', 'Start maintenance workflow.', 'maintenance'),
  ('maintenance.complete', 'Complete maintenance', 'Complete maintenance workflow.', 'maintenance'),
  ('maintenance.cancel', 'Cancel maintenance', 'Cancel maintenance workflow.', 'maintenance'),
  ('maintenance.beyond_repair', 'Mark beyond repair', 'Mark maintenance beyond repair.', 'maintenance'),
  ('repairs.view', 'View repairs', 'View repairs.', 'repairs'),
  ('repairs.create', 'Create repairs', 'Create repairs.', 'repairs'),
  ('repairs.update', 'Update repairs', 'Update repairs.', 'repairs'),
  ('repairs.approve', 'Approve repairs', 'Approve repair quotations.', 'repairs'),
  ('repairs.reject', 'Reject repairs', 'Reject repair quotations.', 'repairs'),
  ('repairs.complete', 'Complete repairs', 'Complete repairs.', 'repairs'),
  ('repairs.return', 'Return repairs', 'Return repaired assets.', 'repairs'),
  ('repairs.cancel', 'Cancel repairs', 'Cancel repairs.', 'repairs'),
  ('audit.view', 'View audit log', 'View audit records.', 'audit'),
  ('reports.view', 'View reports', 'View report catalog and report data.', 'reports'),
  ('reports.export', 'Export reports', 'Export report outputs.', 'reports'),
  ('users.view', 'View users', 'View system users.', 'users'),
  ('users.create', 'Create users', 'Create system users.', 'users'),
  ('users.update', 'Update users', 'Update system users.', 'users'),
  ('users.deactivate', 'Deactivate users', 'Deactivate or reactivate users.', 'users'),
  ('users.reset_password', 'Reset user password', 'Reset user passwords.', 'users'),
  ('roles.view', 'View roles', 'View role and permission mappings.', 'roles'),
  ('roles.manage', 'Manage roles', 'Manage role permission mappings.', 'roles'),
  ('settings.view', 'View settings', 'View system settings.', 'settings'),
  ('settings.manage', 'Manage settings', 'Manage system settings.', 'settings'),
  ('backups.view', 'View backups', 'View backup records.', 'backups'),
  ('backups.create', 'Create backups', 'Create backups.', 'backups'),
  ('backups.restore', 'Restore backups', 'Restore backups.', 'backups');

-- SYSTEM_ADMINISTRATOR gets all permissions.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'SYSTEM_ADMINISTRATOR';

-- IT_MANAGER gets operational full access and limited user oversight.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'IT_MANAGER'
  AND p.code IN (
    'dashboard.view',
    'assets.view','assets.create','assets.update','assets.archive',
    'departments.view','departments.create','departments.update','departments.archive',
    'people.view','people.create','people.update','people.archive',
    'locations.view','locations.create','locations.update','locations.archive',
    'assignments.view','assignments.create','assignments.update','assignments.return','assignments.cancel',
    'maintenance.view','maintenance.create','maintenance.update','maintenance.start','maintenance.complete','maintenance.cancel','maintenance.beyond_repair',
    'repairs.view','repairs.create','repairs.update','repairs.approve','repairs.reject','repairs.complete','repairs.return','repairs.cancel',
    'audit.view',
    'reports.view','reports.export',
    'users.view','users.create','users.update','users.deactivate','users.reset_password',
    'roles.view'
  );

-- IT_OFFICER gets operational create/update permissions without privileged administration.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'IT_OFFICER'
  AND p.code IN (
    'dashboard.view',
    'assets.view','assets.create','assets.update',
    'departments.view','departments.create','departments.update',
    'people.view','people.create','people.update',
    'locations.view','locations.create','locations.update',
    'assignments.view','assignments.create','assignments.update','assignments.return','assignments.cancel',
    'maintenance.view','maintenance.create','maintenance.update','maintenance.start','maintenance.complete','maintenance.cancel','maintenance.beyond_repair',
    'repairs.view','repairs.create','repairs.update','repairs.approve','repairs.reject','repairs.complete','repairs.return','repairs.cancel',
    'reports.view','reports.export'
  );

-- AUDITOR gets read-only and export access.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'AUDITOR'
  AND p.code IN (
    'dashboard.view',
    'assets.view',
    'departments.view',
    'people.view',
    'locations.view',
    'assignments.view',
    'maintenance.view',
    'repairs.view',
    'audit.view',
    'reports.view','reports.export',
    'roles.view'
  );

-- READ_ONLY gets strict view permissions only.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'READ_ONLY'
  AND p.code IN (
    'dashboard.view',
    'assets.view',
    'departments.view',
    'people.view',
    'locations.view',
    'assignments.view',
    'maintenance.view',
    'repairs.view',
    'audit.view',
    'reports.view'
  );
