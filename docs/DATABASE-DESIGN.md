# Database Design

## Backup metadata

Migration 015 expands `backup_records` with `PRE_RESTORE`, `VERIFIED`, and `CORRUPT` lifecycle values plus verification and archival timestamps. Backup files live outside the database and normally outside the repository under `BACKUP_DIRECTORY`; normal API responses never expose `file_path`. A pending restore is applied atomically before SQLite opens, after which migrations and integrity validation run.

## Asset assignments

`asset_assignments` stores immutable assignment history for assets. An assignment targets exactly one active person, department, or location and moves through `ACTIVE`, `RETURNED`, or `CANCELLED`; overdue active records are identified from `expected_return_date`. A partial unique index permits only one active assignment per asset. Returns and cancellations update the existing history row and never delete it. Assignment creation, return, cancellation, and the related asset-status change run in one SQLite transaction.

## Maintenance records

Migration `007_maintenance.sql` adds `maintenance_records`. Each row belongs to one asset and may reference its reporter. The unique `MNT-YYYY-NNNN` number and database checks enforce controlled type, priority and status values, non-negative cost and downtime, and chronological dates. Indexed, soft-archived records preserve an auditable asset history.

## Repair jobs

Migration `008_repairs.sql` adds `repair_jobs`. Repairs optionally link to their originating maintenance record but remain a separate formal workflow. Unique year-sequenced repair numbers, controlled lifecycle and approval values, non-negative financial amounts, chronological completion/return checks, indexed lookup fields, and soft archival preserve vendor and decision history.

## Audit logs

Migration `009_audit_logs.sql` adds append-only `audit_logs`. Controlled entity and action values identify activity across inventory modules. Previous and new values are serialized JSON, with indexes for entity, record, actor, action, and time. Audit records are never hard deleted.

## Settings and backups

Migrations `011_settings_and_backups.sql` and `012_settings_refinements.sql` add `system_settings` and `backup_records`. Settings are grouped by organization, inventory, assignments, maintenance, reports, and security. Each value records its type, editability, sensitivity marker, creator timestamp, update timestamp, and updating user. Backup records retain metadata only: filename, managed filesystem path, checksum, type (`MANUAL`, `AUTOMATIC`, or `PRE_UPDATE`), status, notes, and audit fields. Backup files live outside source control in `database/backups/`.
