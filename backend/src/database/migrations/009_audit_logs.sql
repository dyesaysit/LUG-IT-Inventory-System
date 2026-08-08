CREATE TABLE IF NOT EXISTS audit_logs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 entity_type TEXT NOT NULL CHECK(entity_type IN('ASSET','DEPARTMENT','PERSON','LOCATION','ASSIGNMENT','MAINTENANCE','REPAIR','SYSTEM')),
 entity_id INTEGER, action TEXT NOT NULL CHECK(action IN('CREATE','UPDATE','DELETE','ARCHIVE','RESTORE','ASSIGN','RETURN','CHECKOUT','CHECKIN','LOGIN','LOGOUT','START','COMPLETE','APPROVE','REJECT','CANCEL')),
 performed_by TEXT, performed_by_name TEXT, performed_at TEXT NOT NULL DEFAULT(datetime('now')),
 ip_address TEXT, user_agent TEXT, previous_values TEXT, new_values TEXT, summary TEXT NOT NULL,
 success INTEGER NOT NULL DEFAULT 1 CHECK(success IN(0,1)), created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON audit_logs(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
