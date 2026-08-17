INSERT OR IGNORE INTO permissions (code, name, description, module) VALUES
  ('settings.email', 'Manage email notifications', 'Configure SMTP delivery and send test messages.', 'settings');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.code = 'SYSTEM_ADMINISTRATOR' AND p.code = 'settings.email';

INSERT OR IGNORE INTO system_settings
  (category, key, value, value_type, description, is_sensitive, is_editable)
VALUES
  ('EMAIL', 'enabled', 'false', 'BOOLEAN', 'Send email alerts for ticket activity.', 0, 1),
  ('EMAIL', 'smtp_host', '', 'STRING', 'SMTP server hostname.', 0, 1),
  ('EMAIL', 'smtp_port', '587', 'NUMBER', 'SMTP server port.', 0, 1),
  ('EMAIL', 'smtp_secure', 'false', 'BOOLEAN', 'Use implicit TLS (normally port 465).', 0, 1),
  ('EMAIL', 'smtp_username', '', 'STRING', 'SMTP account username.', 0, 1),
  ('EMAIL', 'smtp_password', '', 'STRING', 'Encrypted SMTP password.', 1, 1),
  ('EMAIL', 'from_name', 'IT Support', 'STRING', 'Sender display name.', 0, 1),
  ('EMAIL', 'from_address', '', 'STRING', 'Sender email address.', 0, 1),
  ('EMAIL', 'application_url', '', 'STRING', 'Public base URL used in email links.', 0, 1);

CREATE TABLE IF NOT EXISTS email_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  text_body TEXT NOT NULL,
  html_body TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SENDING','SENT','FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_pending ON email_outbox(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_user_id INTEGER REFERENCES users(id),
  author_kind TEXT NOT NULL CHECK(author_kind IN ('IT','REQUESTER')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at);
