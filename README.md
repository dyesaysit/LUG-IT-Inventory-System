# School IT Inventory System

A modern inventory management application for school IT departments, built as a group project at Lancaster University.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express, TypeScript, better-sqlite3 |
| Shared | TypeScript types, Zod validation schemas, constants |
| Tooling | ESLint, Prettier, npm workspaces |

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd school-it-inventory

# 2. Install all workspace dependencies
npm install

# 3. Start both frontend and backend in development mode
npm run dev
```

The frontend dev server runs at **http://localhost:5173** (with API proxied to the backend).

The backend API runs at **http://localhost:3001**.

## Project Structure

```
school-it-inventory/
├── frontend/                  # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── assets/            # Static assets (images, fonts, etc.)
│   │   ├── components/        # Shared/reusable React components
│   │   ├── features/          # Feature-specific code (page + sub-components)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── layouts/           # Layout components (MainLayout, etc.)
│   │   ├── pages/             # Page components (one per route)
│   │   ├── routes/            # Route definitions
│   │   ├── services/          # API client and service modules
│   │   ├── styles/            # Global styles (Tailwind directives)
│   │   ├── types/             # Frontend-specific TypeScript types
│   │   └── utils/             # Utility functions
│   ├── public/                # Static files served by Vite
│   ├── index.html             # Vite entry HTML
│   ├── vite.config.ts         # Vite configuration
│   └── tailwind.config.js     # Tailwind CSS configuration
├── backend/                   # Express + better-sqlite3
│   ├── src/
│   │   ├── config/            # Application configuration
│   │   ├── controllers/       # Request handling and response formatting
│   │   ├── database/          # Database connection, migrations, seeds
│   │   ├── middleware/         # Express middleware (error handling, logging, etc.)
│   │   ├── models/            # Database model interfaces/types
│   │   ├── repositories/      # Data-access layer
│   │   ├── routes/            # Route definitions
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utility functions
│   │   ├── app.ts             # Express app (middleware, routes, static serving)
│   │   └── server.ts          # Entry point (starts the server)
│   └── tsconfig.json
├── shared/                    # Shared code used by both frontend and backend
│   ├── src/
│   │   ├── constants/         # Shared constants (app name, API prefix, labels)
│   │   ├── schemas/           # Zod validation schemas
│   │   └── types/             # Shared TypeScript type definitions
│   │   └── index.ts           # Barrel export
│   └── tsconfig.json
├── database/                  # SQLite database directory (git-ignored)
├── docs/                      # Project documentation
├── tests/                     # Test suites (future)
│   ├── backend/
│   ├── e2e/
│   └── frontend/
├── .editorconfig              # Editor settings
├── .eslintrc.json             # ESLint configuration
├── .gitignore                 # Git ignore rules
├── .prettierrc                # Prettier configuration
├── package.json               # Root package.json (workspaces + scripts)
├── tsconfig.base.json         # Shared TypeScript compiler options
├── AGENTS.md                  # Coding conventions and guidelines
└── README.md                  # This file
```

## Available Scripts

All scripts are run from the repository root.

| Command | Description |
|---|---|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Start both frontend and backend in dev mode concurrently |
| `npm run dev:frontend` | Start only the frontend dev server |
| `npm run dev:backend` | Start only the backend dev server in watch mode |
| `npm run build` | Build all workspaces (shared → backend → frontend) |
| `npm run start` | Start the production build (backend serves built frontend) |
| `npm run lint` | Lint all TypeScript/TSX files |
| `npm run lint:fix` | Lint and auto-fix all TypeScript/TSX files |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without writing changes |
| `npm run typecheck` | Run TypeScript type checking across all workspaces |
| `npm run clean` | Remove all `node_modules` and `dist` directories |

## Development Workflow

1. Run `npm run dev` to start both servers.
2. The Vite dev server proxies `/api` requests to the Express backend on port 3001.
3. Any changes to `shared/` will be reflected in both frontend and backend.
4. Follow the conventions in [AGENTS.md](./AGENTS.md).
5. Branch naming: `feature/<description>`, `fix/<description>`, `chore/<description>`.
6. Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).

## Production Build

```bash
npm run build
npm start
```

When running in production mode, the Express server serves the built frontend from `frontend/dist/` and handles all routing (SPA fallback).

## Documentation

- [Project Specification](./docs/PROJECT-SPECIFICATION.md)
- [Database Design](./docs/DATABASE-DESIGN.md)
- [API Specification](./docs/API-SPECIFICATION.md)
- [Security Design](./docs/SECURITY-DESIGN.md)
- [UI Guidelines](./docs/UI-GUIDELINES.md)
- [Roadmap](./docs/ROADMAP.md)
- [Testing Checklist](./docs/TESTING-CHECKLIST.md)

## License

MIT