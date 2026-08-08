-- Migration 016: Link assets to the Locations Master.
-- Adds a nullable current_location_id foreign key to locations(id), preserving
-- the existing free-text current_location column and its data. Existing rows are
-- backfilled by matching the free text to a location name or code where possible.

ALTER TABLE assets ADD COLUMN current_location_id INTEGER REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_assets_current_location_id ON assets(current_location_id);

-- Best-effort backfill: match existing current_location text to a live location.
-- Non-matching text is left untouched (current_location_id stays NULL); no data is deleted.
UPDATE assets
SET current_location_id = (
  SELECT l.id FROM locations l
  WHERE l.archived_at IS NULL
    AND (l.name = assets.current_location COLLATE NOCASE
      OR l.code = assets.current_location COLLATE NOCASE)
  LIMIT 1
)
WHERE current_location_id IS NULL
  AND current_location IS NOT NULL
  AND TRIM(current_location) <> '';
