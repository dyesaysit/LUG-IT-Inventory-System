-- Migration 020: Staff User role and least-privilege Staff Portal access.

INSERT OR IGNORE INTO roles (code, name, description, is_system, is_active) VALUES
  ('STAFF_USER', 'Staff User', 'Self-service access to assigned assets, support tickets, equipment requests, and own profile.', 1, 1);

INSERT OR IGNORE INTO permissions (code, name, description, module) VALUES
  ('portal.access', 'Access staff portal', 'Sign in to the Staff Portal.', 'portal'),
  ('portal.assets.view_own', 'View own assigned assets', 'View assets currently assigned to the linked person.', 'portal'),
  ('portal.tickets.create_own', 'Create own tickets', 'Create support tickets for the signed-in staff account.', 'portal'),
  ('portal.tickets.view_own', 'View own tickets', 'View support tickets created by the signed-in staff account.', 'portal'),
  ('portal.requests.create_own', 'Create own equipment requests', 'Create equipment requests for the signed-in staff account.', 'portal'),
  ('portal.requests.view_own', 'View own equipment requests', 'View equipment requests created by the signed-in staff account.', 'portal'),
  ('portal.profile.manage_own', 'Manage own profile and password', 'View the signed-in profile and change its password.', 'portal');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p
WHERE r.code = 'STAFF_USER' AND p.code IN (
  'portal.access', 'portal.assets.view_own',
  'portal.tickets.create_own', 'portal.tickets.view_own',
  'portal.requests.create_own', 'portal.requests.view_own',
  'portal.profile.manage_own'
);

-- Keep the System Administrator's established all-permissions contract.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p
WHERE r.code = 'SYSTEM_ADMINISTRATOR' AND p.code LIKE 'portal.%';

-- Existing IT roles operate the existing ticket and request administration workflows.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p
WHERE r.code IN ('IT_MANAGER', 'IT_OFFICER')
  AND p.code IN ('tickets.view', 'tickets.create', 'tickets.update', 'tickets.close',
                 'requests.view', 'requests.review', 'requests.fulfil');
