-- Migration 002: Assets module
-- Creates asset_categories and assets tables.

-- Asset categories (predefined types like Laptop, Monitor, etc.)
CREATE TABLE IF NOT EXISTS asset_categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    description TEXT    DEFAULT '',
    is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_tag           TEXT    NOT NULL UNIQUE,
    serial_number       TEXT    UNIQUE,
    category_id         INTEGER NOT NULL REFERENCES asset_categories(id),
    manufacturer        TEXT    DEFAULT '',
    model               TEXT    DEFAULT '',
    description         TEXT    DEFAULT '',
    purchase_date       TEXT,
    purchase_cost       REAL,
    warranty_expiry_date TEXT,
    condition           TEXT    NOT NULL DEFAULT 'GOOD'
                        CHECK (condition IN ('NEW','GOOD','FAIR','POOR','DAMAGED')),
    status              TEXT    NOT NULL DEFAULT 'IN_STOCK'
                        CHECK (status IN ('IN_STOCK','ASSIGNED','DEPLOYED','UNDER_REPAIR','RETIRED','LOST','DISPOSED')),
    current_location     TEXT    DEFAULT '',
    notes               TEXT    DEFAULT '',
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    archived_at         TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assets_category_id ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_condition ON assets(condition);
CREATE INDEX IF NOT EXISTS idx_assets_archived_at ON assets(archived_at);
CREATE INDEX IF NOT EXISTS idx_assets_serial_number ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_updated_at ON assets(updated_at);

-- Seed asset categories
INSERT OR IGNORE INTO asset_categories (name, description) VALUES
    ('Laptop', 'Portable notebook computers'),
    ('Desktop Computer', 'Tower or small-form-factor desktop PCs'),
    ('Monitor', 'Display screens and monitors'),
    ('Projector', 'Classroom and meeting room projectors'),
    ('Printer', 'Printers and multi-function devices'),
    ('Network Switch', 'Ethernet network switches'),
    ('Router', 'Network routers and gateways'),
    ('Access Point', 'Wi-Fi access points'),
    ('Server', 'Server hardware'),
    ('UPS', 'Uninterruptible power supplies'),
    ('Other', 'Miscellaneous IT equipment');