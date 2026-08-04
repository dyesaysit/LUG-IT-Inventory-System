-- Migration 003: Departments module

CREATE TABLE IF NOT EXISTS departments (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    code               TEXT    NOT NULL UNIQUE,
    name               TEXT    NOT NULL,
    description        TEXT,
    head_of_department TEXT,
    email              TEXT,
    phone              TEXT,
    is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    archived_at        TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_active_name
    ON departments(name COLLATE NOCASE)
    WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_archived_at ON departments(archived_at);
