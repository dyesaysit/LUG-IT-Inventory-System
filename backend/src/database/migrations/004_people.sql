-- Migration 004: People module

CREATE TABLE IF NOT EXISTS people (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id          TEXT    NOT NULL UNIQUE,
    first_name        TEXT    NOT NULL,
    last_name         TEXT    NOT NULL,
    email             TEXT,
    phone             TEXT,
    job_title         TEXT,
    department_id     INTEGER REFERENCES departments(id),
    employment_status TEXT    NOT NULL DEFAULT 'ACTIVE'
                      CHECK (employment_status IN ('ACTIVE','ON_LEAVE','SUSPENDED','LEFT')),
    notes             TEXT,
    is_active         INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    archived_at       TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_people_email_unique
    ON people(email COLLATE NOCASE) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_staff_id ON people(staff_id);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_people_department_id ON people(department_id);
CREATE INDEX IF NOT EXISTS idx_people_employment_status ON people(employment_status);
CREATE INDEX IF NOT EXISTS idx_people_is_active ON people(is_active);
CREATE INDEX IF NOT EXISTS idx_people_archived_at ON people(archived_at);
