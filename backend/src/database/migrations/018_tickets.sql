-- Migration 018: Ticket Management
-- Tickets are the entry point for an IT issue. They flow
-- New -> Assigned -> In progress -> (spawn Maintenance or Repair) -> Completed -> Closed.
-- The actual work reuses the existing maintenance_records / repair_jobs modules,
-- linked here by id — no duplicate maintenance/repair logic is created.

CREATE TABLE IF NOT EXISTS tickets (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number          TEXT    NOT NULL UNIQUE,
    title                  TEXT    NOT NULL,
    description            TEXT,
    asset_id               INTEGER REFERENCES assets(id),
    priority               TEXT    NOT NULL DEFAULT 'MEDIUM'
                           CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status                 TEXT    NOT NULL DEFAULT 'NEW'
                           CHECK (status IN ('NEW','ASSIGNED','IN_PROGRESS','COMPLETED','CLOSED','CANCELLED')),
    assigned_to            TEXT,
    reported_by_user_id    INTEGER REFERENCES users(id),
    reported_by_person_id  INTEGER REFERENCES people(id),
    maintenance_record_id  INTEGER REFERENCES maintenance_records(id),
    repair_job_id          INTEGER REFERENCES repair_jobs(id),
    resolution             TEXT,
    created_at             TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at             TEXT    NOT NULL DEFAULT (datetime('now')),
    closed_at              TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_asset ON tickets(asset_id);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);

-- Permissions for the module.
INSERT OR IGNORE INTO permissions (code, name, description, module) VALUES
  ('tickets.view', 'View tickets', 'View IT support tickets.', 'tickets'),
  ('tickets.create', 'Create tickets', 'Raise new IT support tickets.', 'tickets'),
  ('tickets.update', 'Update tickets', 'Assign, progress and resolve tickets, including linking maintenance/repair jobs.', 'tickets'),
  ('tickets.close', 'Close tickets', 'Close completed tickets.', 'tickets');

-- Grant the new permissions to the System Administrator role.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'SYSTEM_ADMINISTRATOR'
  AND p.code IN ('tickets.view', 'tickets.create', 'tickets.update', 'tickets.close');
