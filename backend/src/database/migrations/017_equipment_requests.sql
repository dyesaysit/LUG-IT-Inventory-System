-- Migration 017: Staff Portal — equipment requests
-- Lets staff request new equipment and track the status. Problem reports reuse
-- the existing maintenance module, so no new table is needed for those.

CREATE TABLE IF NOT EXISTS equipment_requests (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_by_user_id   INTEGER NOT NULL REFERENCES users(id),
    requested_by_person_id INTEGER REFERENCES people(id),
    item_name              TEXT    NOT NULL,
    category               TEXT,
    quantity               INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    justification          TEXT,
    status                 TEXT    NOT NULL DEFAULT 'PENDING'
                           CHECK (status IN ('PENDING','APPROVED','REJECTED','FULFILLED','CANCELLED')),
    review_notes           TEXT,
    reviewed_by            TEXT,
    reviewed_at            TEXT,
    created_at             TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at             TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_equipment_requests_user ON equipment_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_requests_status ON equipment_requests(status);
