# Security Design

## Backup and restore security

Backup operations use granular `settings.backup.view/create/download/verify/restore/archive` permissions. Files are constrained to the managed backup directory, use safe generated names, and are checked for SHA-256 consistency, SQLite integrity, and required tables. Restore requires exact `RESTORE` confirmation, creates a `PRE_RESTORE` backup, is restart-required, and revokes all restored sessions after application. Automatic scheduling is not currently implemented.

## Password Policy

Passwords (initial administrator, user creation, administrator reset, and
change password) must contain:

* At least 6 characters
* One uppercase letter
* One number
* One special character

Lowercase letters are not required and there is no common-password blacklist.
The policy is enforced in one place: `PasswordSchema` in
`shared/src/schemas/Auth.ts`.

## Dependency Risk Exception

As of August 2026, npm audit reports GHSA-qwww-vcr4-c8h2 against
React Router 7.18.2.

The advisory applies specifically to unstable React Server Components
(RSC) APIs. This application is a conventional client-side Vite SPA and
does not use React Router RSC mode.

The dependency will be upgraded to React Router 8.3.0 or later when the
project also adopts its required React, Vite, and ESM baselines.

The development team must not enable unstable React Router RSC APIs while
this exception remains active.

## Settings and backup safeguards

Settings routes require authentication and explicit RBAC permissions. Read-only callers receive settings without edit controls; non-editable values, including the fixed Ghanaian Cedi currency and symbol, are rejected by the service. Values marked sensitive are masked before leaving the backend.

Backups are created and restored only from the configured, server-managed backup directory. Download and restore resolve numeric record IDs rather than user-supplied paths, verify the resolved path remains inside that directory, and validate the stored SHA-256 checksum before restore. Restore requires the literal `RESTORE` confirmation and creates a `PRE_UPDATE` safety backup first.
