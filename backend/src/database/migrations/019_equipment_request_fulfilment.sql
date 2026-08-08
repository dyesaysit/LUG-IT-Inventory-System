-- Migration 019: Admin equipment request workflow
-- Links a fulfilled request to the assignment created for it, and adds the
-- permissions used to review and fulfil requests. Fulfilment reuses the
-- existing asset_assignments module (no duplicate assignment logic).

ALTER TABLE equipment_requests ADD COLUMN fulfilment_assignment_id INTEGER REFERENCES asset_assignments(id);

CREATE INDEX IF NOT EXISTS idx_equipment_requests_fulfilment ON equipment_requests(fulfilment_assignment_id);

INSERT OR IGNORE INTO permissions (code, name, description, module) VALUES
  ('requests.view', 'View equipment requests', 'View the staff equipment request queue.', 'requests'),
  ('requests.review', 'Review equipment requests', 'Approve, reject or ask for more information on requests.', 'requests'),
  ('requests.fulfil', 'Fulfil equipment requests', 'Assign an asset to fulfil an approved request.', 'requests');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'SYSTEM_ADMINISTRATOR'
  AND p.code IN ('requests.view', 'requests.review', 'requests.fulfil');
