-- Migration 007: Maintenance service tracking

CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maintenance_number TEXT NOT NULL UNIQUE,
    asset_id INTEGER NOT NULL REFERENCES assets(id),
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('CORRECTIVE','PREVENTIVE','INSPECTION','UPGRADE','WARRANTY_SERVICE','OTHER')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status TEXT NOT NULL DEFAULT 'REPORTED' CHECK (status IN ('REPORTED','SCHEDULED','IN_PROGRESS','WAITING_FOR_PARTS','COMPLETED','CANCELLED','BEYOND_REPAIR')),
    reported_date TEXT NOT NULL,
    scheduled_date TEXT,
    started_date TEXT,
    completed_date TEXT,
    reported_by_person_id INTEGER REFERENCES people(id),
    assigned_technician TEXT,
    vendor TEXT,
    fault_description TEXT,
    diagnosis TEXT,
    work_performed TEXT,
    parts_used TEXT,
    maintenance_cost REAL NOT NULL DEFAULT 0 CHECK (maintenance_cost >= 0),
    downtime_hours REAL NOT NULL DEFAULT 0 CHECK (downtime_hours >= 0),
    condition_before TEXT CHECK (condition_before IS NULL OR condition_before IN ('NEW','GOOD','FAIR','POOR','DAMAGED')),
    condition_after TEXT CHECK (condition_after IS NULL OR condition_after IN ('NEW','GOOD','FAIR','POOR','DAMAGED')),
    resolution TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT,
    CHECK (started_date IS NULL OR started_date >= reported_date),
    CHECK (completed_date IS NULL OR started_date IS NOT NULL AND completed_date >= started_date)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_number ON maintenance_records(maintenance_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset_id ON maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_type ON maintenance_records(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON maintenance_records(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_reported_date ON maintenance_records(reported_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled_date ON maintenance_records(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_technician ON maintenance_records(assigned_technician);
CREATE INDEX IF NOT EXISTS idx_maintenance_archived_at ON maintenance_records(archived_at);
