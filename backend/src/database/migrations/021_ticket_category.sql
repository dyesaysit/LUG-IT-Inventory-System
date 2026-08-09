-- Migration 021: ticket classification used by both portal and IT queue.
ALTER TABLE tickets ADD COLUMN category TEXT NOT NULL DEFAULT 'OTHER'
  CHECK (category IN ('DEVICE','NETWORK','ACCOUNT','SOFTWARE','ACCESS','OTHER'));

