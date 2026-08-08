-- Migration 013: White-label organization profile
-- Replaces hardcoded Lancaster/Ghana branding with configurable organization settings.
-- Unlocks currency fields so they can be changed per deployment.
-- Preserves existing LUG settings as defaults.

-- Mark existing currency settings as editable (they were locked in migration 012)
UPDATE system_settings SET is_editable = 1
WHERE category = 'ORGANIZATION' AND key IN ('currency', 'currency_symbol');

-- Add new organization profile settings.
-- Uses INSERT OR IGNORE so existing values are never overwritten.
INSERT OR IGNORE INTO system_settings (category, key, value, value_type, description, is_sensitive, is_editable) VALUES
  ('ORGANIZATION', 'organization_short_name', 'LUG', 'STRING', 'Short name / abbreviation for the organization (e.g. LUG, GPA).', 0, 1),
  ('ORGANIZATION', 'country_code', 'GH', 'STRING', 'ISO 3166-1 alpha-2 country code (e.g. GH, GM).', 0, 1),
  ('ORGANIZATION', 'country_name', 'Ghana', 'STRING', 'Human-readable country name.', 0, 1),
  ('ORGANIZATION', 'locale', 'en-GH', 'STRING', 'BCP 47 locale tag used for date/number formatting.', 0, 1),
  ('ORGANIZATION', 'currency_name', 'Ghanaian Cedi', 'STRING', 'Human-readable currency name.', 0, 1),
  ('ORGANIZATION', 'support_phone', '', 'STRING', 'Support phone number shown to users.', 0, 1),
  ('ORGANIZATION', 'address', '', 'STRING', 'Organization physical/postal address.', 0, 1),
  ('ORGANIZATION', 'website', '', 'STRING', 'Organization website URL.', 0, 1),
  ('ORGANIZATION', 'logo_path', '', 'STRING', 'Relative path or identifier for the organization logo.', 0, 1),
  ('ORGANIZATION', 'favicon_path', '', 'STRING', 'Relative path or identifier for the browser favicon.', 0, 1);

-- Add report branding settings
INSERT OR IGNORE INTO system_settings (category, key, value, value_type, description, is_sensitive, is_editable) VALUES
  ('REPORTS', 'report_footer_text', '', 'STRING', 'Custom footer text shown at the bottom of printed/exported reports.', 0, 1),
  ('REPORTS', 'report_organization_name', 'Lancaster University Ghana', 'STRING', 'Organization name shown on report headers (may differ from system_name).', 0, 1),
  ('REPORTS', 'report_confidentiality_footer', 'For internal use only.', 'STRING', 'Confidentiality footer text shown on printed/exported reports.', 0, 1);

-- Add new permissions for branding and regional settings management
INSERT OR IGNORE INTO permissions (code, name, description, module) VALUES
  ('settings.branding', 'Manage branding settings', 'Update organization name, logo, application name, and report branding.', 'settings'),
  ('settings.regional', 'Manage regional settings', 'Update country, currency, timezone, locale, and date/time formats.', 'settings');

-- SYSTEM_ADMINISTRATOR receives the new permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'SYSTEM_ADMINISTRATOR'
  AND p.code IN ('settings.branding', 'settings.regional');