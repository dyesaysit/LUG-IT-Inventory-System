# School IT Inventory System

## Backup and restore

Administrators can create, verify, download, archive, and stage manual SQLite backups from **Settings → Backup & restore**. `BACKUP_DIRECTORY` optionally selects storage; when omitted, backups use the operating system's local application-data directory. Creation uses SQLite's online backup API and verification checks SHA-256, `integrity_check`, and critical tables.

Restore creates a `PRE_RESTORE` safety backup and stages an atomic replacement for the next backend restart. Restarting applies migrations, validates integrity, revokes restored sessions, and requires users to sign in again. Automatic scheduling and retention cleanup are not implemented.

This is a school IT inventory system built using Node.js, Express, and React.

## Features

* Asset management: create, read, update, and delete assets
* Asset categorization: categorize assets by type, manufacturer, and model
* Asset tracking: track asset location and status
* User authentication: authenticate users using username and password
* Authorization: authorize users to perform actions based on their role
* Settings and system administration: manage organization, inventory, assignment, maintenance, report, and security preferences with role-based access
* Backup and database maintenance: create, verify, download, restore, and audit SQLite backups; run integrity checks, optimization, and WAL checkpoints

Passwords must be at least 6 characters and include one uppercase letter, one number, and one special character.

## Installation

1. Clone the repository: `git clone https://github.com/your-username/school-it-inventory.git`
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Open the application: `http://localhost:3000`

## Usage

1. Create an asset: click on the "Create Asset" button and fill in the asset details
2. View assets: click on the "Assets" tab to view all assets
3. Update an asset: click on the "Update" button next to an asset and fill in the updated details
4. Delete an asset: click on the "Delete" button next to an asset

### Asset assignments

The Assignments module connects inventory assets to active people, departments, and locations. It prevents overlapping active assignments, synchronizes asset status during assignment and return, records return condition and location, and preserves the complete assignment history. Use `/assignments` for new assignments, returns, cancellations, details, and history.

### Settings and system administration

The Settings page is available only to users with `settings.view`. Category-specific permissions control editing and administration. It includes organization, inventory, assignments, maintenance and repairs, reports, security, asset categories, backups, database maintenance, and system information. Currency is fixed to Ghanaian Cedi (`GHS`, `GH₵`); completed backups are checksum-verified before restore, and a pre-restore safety backup is created automatically.

## Contributing

Contributions are welcome! Please submit a pull request with your changes and a brief description of what you've added or fixed.

## License

This project is licensed under the MIT License.

## Maintenance management

The Maintenance module supports reporting, scheduling, starting, waiting for parts, completion, cancellation, and beyond-repair decisions. Asset status and condition are synchronized transactionally while completed records remain available as maintenance history.

## Repairs management

Repairs complements Maintenance with formal internal and external repair jobs. It records vendor quotations, approval decisions, delivery, parts, final costs, outcomes, returns, and replacement recommendations while preserving a complete asset history.

## Audit trail

The Audit Log records successful inventory changes after their business transactions complete. Events preserve the entity, action, system actor, timestamp, readable summary, and JSON before/after values for review without altering operational records.

## Audit trail

The Audit Log records successful inventory changes after their business transactions complete. Events preserve the entity, action, system actor, timestamp, readable summary, and JSON before/after values for review without altering operational records.

## Repairs management

Repairs complements Maintenance with formal internal and external repair jobs. It records vendor quotations, approval decisions, delivery, parts, final costs, outcomes, returns, and replacement recommendations while preserving a complete asset history.

## Maintenance management

The Maintenance module supports reporting, scheduling, starting, waiting for parts, completion, cancellation, and beyond-repair decisions. Asset status and condition are synchronized transactionally while completed records remain available as maintenance history.
