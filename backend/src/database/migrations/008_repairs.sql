CREATE TABLE IF NOT EXISTS repair_jobs (
 id INTEGER PRIMARY KEY AUTOINCREMENT, repair_number TEXT NOT NULL UNIQUE,
 asset_id INTEGER NOT NULL REFERENCES assets(id), maintenance_record_id INTEGER REFERENCES maintenance_records(id),
 repair_type TEXT NOT NULL CHECK(repair_type IN('INTERNAL','EXTERNAL','WARRANTY','EMERGENCY','OTHER')),
 priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN('LOW','MEDIUM','HIGH','CRITICAL')),
 status TEXT NOT NULL DEFAULT 'REPORTED' CHECK(status IN('REPORTED','DIAGNOSING','AWAITING_QUOTATION','AWAITING_APPROVAL','APPROVED','SENT_TO_VENDOR','IN_REPAIR','WAITING_FOR_PARTS','COMPLETED','RETURNED','CANCELLED','BEYOND_REPAIR')),
 reported_date TEXT NOT NULL, sent_date TEXT, received_by_vendor_date TEXT, estimated_completion_date TEXT, completed_date TEXT, returned_to_school_date TEXT,
 vendor_name TEXT, vendor_contact TEXT, vendor_reference TEXT, quotation_number TEXT,
 quotation_amount REAL CHECK(quotation_amount IS NULL OR quotation_amount>=0), approved_amount REAL CHECK(approved_amount IS NULL OR approved_amount>=0), final_cost REAL NOT NULL DEFAULT 0 CHECK(final_cost>=0),
 approval_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED' CHECK(approval_status IN('NOT_REQUIRED','PENDING','APPROVED','REJECTED')), approved_by TEXT,
 assigned_technician TEXT, fault_description TEXT NOT NULL, diagnosis TEXT, repair_action TEXT, parts_replaced TEXT,
 warranty_claim INTEGER NOT NULL DEFAULT 0 CHECK(warranty_claim IN(0,1)), warranty_reference TEXT,
 outcome TEXT CHECK(outcome IS NULL OR outcome IN('REPAIRED','PARTIALLY_REPAIRED','UNREPAIRABLE','REPLACEMENT_RECOMMENDED','RETURNED_WITHOUT_REPAIR')),
 replacement_recommended INTEGER NOT NULL DEFAULT 0 CHECK(replacement_recommended IN(0,1)), replacement_reason TEXT, notes TEXT,
 created_at TEXT NOT NULL DEFAULT(datetime('now')), updated_at TEXT NOT NULL DEFAULT(datetime('now')), archived_at TEXT,
 CHECK(completed_date IS NULL OR completed_date>=reported_date), CHECK(returned_to_school_date IS NULL OR completed_date IS NOT NULL AND returned_to_school_date>=completed_date)
);
CREATE INDEX IF NOT EXISTS idx_repairs_number ON repair_jobs(repair_number); CREATE INDEX IF NOT EXISTS idx_repairs_asset ON repair_jobs(asset_id);
CREATE INDEX IF NOT EXISTS idx_repairs_maintenance ON repair_jobs(maintenance_record_id); CREATE INDEX IF NOT EXISTS idx_repairs_vendor ON repair_jobs(vendor_name);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repair_jobs(status); CREATE INDEX IF NOT EXISTS idx_repairs_priority ON repair_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_repairs_approval ON repair_jobs(approval_status); CREATE INDEX IF NOT EXISTS idx_repairs_reported ON repair_jobs(reported_date);
CREATE INDEX IF NOT EXISTS idx_repairs_completed ON repair_jobs(completed_date); CREATE INDEX IF NOT EXISTS idx_repairs_archived ON repair_jobs(archived_at);
