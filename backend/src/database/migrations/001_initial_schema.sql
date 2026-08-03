-- 001_initial_schema.sql
-- Creates the schema_migrations tracking table.
-- This table records every applied migration so the runner can
-- skip migrations that have already been applied.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version   INTEGER PRIMARY KEY,
  name      TEXT    NOT NULL,
  applied_at TEXT   NOT NULL DEFAULT (datetime('now'))
);