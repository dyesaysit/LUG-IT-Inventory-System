CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('TICKET','EQUIPMENT_REQUEST')),
  entity_id INTEGER NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')), read_at TEXT
);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
