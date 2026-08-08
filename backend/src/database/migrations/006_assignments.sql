-- Migration 006: Asset assignment lifecycle

CREATE TABLE IF NOT EXISTS asset_assignments (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id             INTEGER NOT NULL REFERENCES assets(id),
    assignment_type      TEXT NOT NULL CHECK (assignment_type IN ('PERSON','DEPARTMENT','LOCATION')),
    person_id            INTEGER REFERENCES people(id),
    department_id        INTEGER REFERENCES departments(id),
    location_id          INTEGER REFERENCES locations(id),
    assigned_date        TEXT NOT NULL,
    expected_return_date TEXT,
    returned_date        TEXT,
    status               TEXT NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE','RETURNED','OVERDUE','CANCELLED')),
    purpose              TEXT,
    notes                TEXT,
    assigned_by          TEXT,
    returned_by          TEXT,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at          TEXT,
    CHECK (
      (assignment_type = 'PERSON' AND person_id IS NOT NULL AND department_id IS NULL AND location_id IS NULL)
      OR (assignment_type = 'DEPARTMENT' AND department_id IS NOT NULL AND person_id IS NULL AND location_id IS NULL)
      OR (assignment_type = 'LOCATION' AND location_id IS NOT NULL AND person_id IS NULL AND department_id IS NULL)
    ),
    CHECK (expected_return_date IS NULL OR expected_return_date >= assigned_date),
    CHECK (returned_date IS NULL OR returned_date >= assigned_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_one_active_asset
    ON asset_assignments(asset_id) WHERE status = 'ACTIVE' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_asset_id ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_assignments_person_id ON asset_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_assignments_department_id ON asset_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_assignments_location_id ON asset_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON asset_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_date ON asset_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_assignments_expected_return ON asset_assignments(expected_return_date);
CREATE INDEX IF NOT EXISTS idx_assignments_archived_at ON asset_assignments(archived_at);
