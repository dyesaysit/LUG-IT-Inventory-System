# School IT Inventory System (School Project Information System)

A modern web-based IT Asset & Inventory Management System designed for educational institutions to manage, track, and maintain technology assets throughout their lifecycle.

This project is being developed as part of an Introduction to Programming course while following real-world software engineering practices.

---

## Features

### Asset Management

- Register IT assets
- Asset categories
- Barcode / QR support
- Asset tagging
- Serial number management
- Warranty tracking

### Assignment Management

- Assign assets to staff
- Assign assets to departments
- Deploy assets to classrooms
- Deploy network devices to physical locations
- Return assets
- Transfer assets

### Location Management

- Campus
- Buildings
- Floors
- Offices
- Classrooms
- Server rooms
- Network racks

### Maintenance

- Fault reporting
- Repair history
- Replacement tracking
- Asset lifecycle
- Retirement records

### Reporting

- Assets by department
- Assets by person
- Assets by location
- Warranty reports
- Maintenance reports
- Audit logs

### Security

- User authentication
- Role-based access control
- Audit trail
- Daily database backups

---

# Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

## Backend

- Node.js
- Express
- TypeScript

## Database

- SQLite
- better-sqlite3

---

# Project Structure

```
school-it-inventory/
│
├── frontend/
├── backend/
├── shared/
├── docs/
├── tests/
├── installer/
└── README.md
```

---

# System Architecture

```
Browser
    │
    ▼
React Frontend
    │
REST API
    │
Express Backend
    │
SQLite Database
```

Only the backend communicates directly with the SQLite database.

---

# Core Modules

- Dashboard
- Asset Register
- Departments
- Staff
- Locations
- Assignments
- Transfers
- Maintenance
- Replacements
- Reports
- User Management

---

# Development Roadmap

## Phase 1

- Documentation
- Requirements
- Database Design
- API Design

## Phase 2

- Backend Foundation
- SQLite
- Authentication
- REST API

## Phase 3

- Frontend Foundation
- Dashboard
- Asset Registration

## Phase 4

- Assignments
- Transfers
- Returns

## Phase 5

- Maintenance
- Replacements

## Phase 6

- Reports
- Barcode & QR Labels

## Phase 7

- Installer
- Backup & Restore

---

# Goals

The project aims to provide an easy-to-use inventory management solution that allows IT departments to:

- Know where every IT asset is located
- Know who is responsible for each asset
- Track maintenance history
- Track replacements
- Maintain complete audit records
- Produce inventory reports

---

# Documentation

Project documentation is available in the **docs/** directory.

- Project Specification
- Database Design
- API Specification
- UI Guidelines
- Security Design
- Testing Checklist

---

# License

This project is developed for educational purposes.

---

# Authors

Introduction to Programming Group Project

School IT Inventory Team
