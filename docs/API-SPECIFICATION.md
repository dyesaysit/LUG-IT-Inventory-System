# API Specification

## Backup endpoints

All routes require authentication and their corresponding `settings.backup.*` permission: `GET/POST /api/settings/backups`, `GET /api/settings/backups/:id`, `GET /:id/download`, `POST /:id/verify`, `POST /:id/restore`, and `POST /:id/archive`. Restore requires `{ "confirmation": "RESTORE" }` and returns `{ "success": true, "restartRequired": true, "message": "..." }`; it does not claim a hot restore.

## Assignments

- `GET /api/assignments` lists assignment history with target, date, status, overdue, pagination, and sorting filters.
- `GET /api/assignments/:id` returns one assignment with joined asset and target display data.
- `POST /api/assignments` creates an assignment and changes the asset to `ASSIGNED` or `DEPLOYED`.
- `PATCH /api/assignments/:id` edits dates, purpose, or notes on an active assignment.
- `POST /api/assignments/:id/return` records a return and restores the asset to `IN_STOCK`.
- `POST /api/assignments/:id/cancel` cancels an active assignment and restores the asset to `IN_STOCK`.
- `GET /api/assets/:assetId/assignment-history` returns preserved assignment and return history.

Conflicting active assignments return HTTP 409. Invalid targets and lifecycle transitions return HTTP 400; missing records return HTTP 404.

## Maintenance

- `GET /api/maintenance` lists and filters maintenance records; `GET /api/maintenance/summary` returns live operational totals.
- `GET /api/maintenance/:id`, `POST /api/maintenance`, and `PATCH /api/maintenance/:id` read, create, and update records.
- `POST /api/maintenance/:id/start`, `/waiting-for-parts`, `/complete`, `/cancel`, and `/beyond-repair` perform validated lifecycle transitions.
- `GET /api/assets/:assetId/maintenance-history` returns preserved history.

Completion restores assignment-derived asset status (or `IN_STOCK`) and applies the resulting condition. Beyond-repair retires and damages the asset.

## Repairs

`GET /api/repairs`, `/summary`, and `/:id` expose filtered repair jobs, operational totals, and details. `POST /api/repairs` creates a job; `PATCH /:id` updates non-terminal details. Workflow endpoints are `/:id/quotation`, `/approve`, `/reject`, `/send-to-vendor`, `/start`, `/waiting-for-parts`, `/complete`, `/return`, `/cancel`, and `/beyond-repair`. `GET /api/assets/:assetId/repair-history` preserves asset history.

External and warranty jobs require a vendor. Quotations become pending approvals; rejected jobs cannot continue. Completion records cost and outcome, restoration respects active assignments, and beyond-repair decisions retire damaged assets.

## Audit Log

- `GET /api/audit` lists events with search, entity, action, actor, date, success, paging, and sorting filters.
- `GET /api/audit/summary` returns total, today, successful, and failed counts.
- `GET /api/audit/:id` returns a complete event including JSON changes.
- `GET /api/audit/entity/:entity/:id` returns an entity timeline.

Logging runs only after successful mutations. Assets, organizational records, assignments, maintenance, repairs, and system lifecycle events emit one event per configured operation.

## Settings and system administration

- `GET /api/settings` and `GET /api/settings/:category` return settings plus a `readOnly` flag.
- `PATCH /api/settings` applies a transactional batch of category/key/value updates; `PATCH /api/settings/:category` scopes a batch to one category. `PATCH /api/settings/:category/:key` updates one setting.
- `GET /api/settings/system-info` returns safe version, runtime, SQLite, database, timezone, and currency information.
- `GET /api/settings/backups`, `POST /api/settings/backups`, `GET /api/settings/backups/:id/download`, `POST /api/settings/backups/:id/verify`, and `POST /api/settings/backups/:id/restore` manage verified backups. Restore requires `{ "confirmation": "RESTORE" }`.
- `GET /api/settings/database/status` and `POST /api/settings/database/integrity-check`, `/optimize`, and `/checkpoint` provide database maintenance.

All endpoints require authentication. `settings.view` grants viewing; category management, backup, restore, database, reports, and security actions require their corresponding permission. Backup IDs are numeric and resolve only to server-managed backup paths.
