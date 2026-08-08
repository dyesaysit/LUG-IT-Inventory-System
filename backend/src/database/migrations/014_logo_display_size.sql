-- Migration 014: Logo display size and layout alignment options
-- Adds setting key for logo display size in pixels.

INSERT OR IGNORE INTO system_settings (category, key, value, value_type, description, is_sensitive, is_editable) VALUES
  ('ORGANIZATION', 'logo_display_size', '120', 'NUMBER', 'Size of the organization logo in pixels (allowed: 60 to 200).', 0, 1);
