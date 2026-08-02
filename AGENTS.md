# AGENTS

Project conventions and coding guidelines for the School IT Inventory System.

## General

- **Language**: TypeScript (strict mode) everywhere.
- **Formatting**: Prettier (2 spaces, single quotes, trailing commas, LF line endings).
- **Linting**: ESLint with `@typescript-eslint` and React plugins.
- **Environment**: Node.js >= 18, npm >= 9.

## Monorepo (npm workspaces)

- `frontend/` — React + Vite + Tailwind CSS
- `backend/` — Express + better-sqlite3
- `shared/` — shared types, Zod schemas, and constants (used by both)

Always run `npm install` from the repository root.

## Code style

- Prefer `const` over `let`; never use `var`.
- Use named exports (avoid `export default` unless it is a page component or a React Router lazy route).
- Barrel files (`index.ts`) at every directory level for clean imports.
- Type imports should use `import type { Thing } from '...'`.
- Use `node:` prefixes for built-in Node.js modules.
- Keep files under 300 lines; split by concern.
- JSDoc comments on all exported functions and constants.

## Naming

- **Files**: `kebab-case` for non-component files, `PascalCase` for React components.
- **Directories**: `kebab-case` or singular noun (`services/`, `hooks/`, `utils/`).
- **Variables / functions**: `camelCase`.
- **Types / interfaces**: `PascalCase`.

## Backend conventions

- The `src/server.ts` file is the entry point; it should only call `app.listen`.
- `src/app.ts` composes middleware, routes, and the static frontend server.
- Follow a layered architecture:
  - `routes/` — thin HTTP layer; delegates to controllers
  - `controllers/` — request parsing and response formatting
  - `services/` — business logic
  - `repositories/` — database access (using better-sqlite3)
- Use `shared` for types and validation schemas—never duplicate them.

## Frontend conventions

- React 18 with `react-router-dom` v6.
- Pages are placed in `src/pages/` and are the default export.
- Shared components go in `src/components/`.
- Feature-specific code (page + its sub-components) lives in `src/features/<feature-name>/`.
- Custom hooks live in `src/hooks/`.
- API calls go through `src/services/api.ts` (or a sub-module).
- Tailwind utility classes only; no inline styles unless absolutely necessary.

## Testing (future)

- Unit tests: `vitest` (frontend), `vitest` or `node --test` (backend).
- Integration tests: `vitest` + `supertest`.
- e2e: `playwright`.

## Git workflow

- Branch naming: `feature/<description>`, `fix/<description>`, `chore/<description>`.
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- PRs require at least one review before merging into `main`.

## Useful commands

| Command | Description |
|---|---|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Start both backend and frontend in dev mode |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all TypeScript files |
| `npm run format` | Format all files with Prettier |
| `npm run typecheck` | Run TypeScript type checking across all workspaces |