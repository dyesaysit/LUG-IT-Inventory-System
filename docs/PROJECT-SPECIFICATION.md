# Project Specification

## Authentication

Password requirements apply consistently across bootstrap, user creation,
administrator reset, and change password: minimum 6 characters, one
uppercase letter, one number, and one special character.

## Assignment lifecycle

Assets can be assigned to a person or department, or deployed to a location. Only active, non-archived targets and assignable assets are accepted. Person and department assignments synchronize the asset to `ASSIGNED`; location assignments use `DEPLOYED`. Returning or cancelling restores `IN_STOCK`. Returned assignments are read-only, and previous assignments remain available in the asset history timeline.

## Maintenance module

IT staff can report and prioritize maintenance, assign technician and vendor details, and progress work through a controlled lifecycle. Completion captures work, parts, cost, downtime, resolution, and resulting condition. The Maintenance page provides live summaries, filters, details and workflow dialogs; Assets links to maintenance history and the Dashboard consumes resilient live maintenance statistics.

## Repairs module

Maintenance records service activity; Repairs manages formal jobs requiring diagnosis, vendor quotation, institutional approval, parts, cost, and return-to-service decisions. Internal jobs can proceed from diagnosis, while approved external or warranty jobs are sent to a vendor. Completion records outcomes and replacement recommendations, and return confirms school receipt. Assets, Maintenance, and Dashboard expose linked, live repair state without duplicating work records.

## Audit Log module

The append-only audit trail gives administrators a searchable timeline of successful inventory changes. Each event records its entity, action, system actor, time, summary, result, and readable JSON before/after state. The Audit Log page offers filters, paging, summaries and detail comparison, while Dashboard recent activity consumes the same live endpoint with isolated error handling.

## Settings and system administration module

Authorized users can view and, where permitted, maintain organization, inventory, assignment, maintenance and repair, report, and security settings. The module also provides governed asset-category administration, backup creation/download/checksum verification/restore, database health operations, and safe system information. Settings changes and administrative backup operations create audit events. Users without `settings.view` cannot access Settings; view-only users receive a read-only experience.
