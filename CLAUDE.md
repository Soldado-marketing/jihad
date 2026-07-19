# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

- **Project name:** MAOS — Soldado Marketing Platform
- **Project root:** `/Users/jihadhilal/Documents/claude`
- **Active frontend:** `apps/web` (Next.js 15)
- **Active backend:** `apps/api` (NestJS 11)
- **Full rules:** `PROJECT_RULES.md`

## Commands

### API (`apps/api/`)

```bash
npm run dev              # Start NestJS in watch mode (port 3001)
npm run build            # Compile TypeScript
npm run typecheck        # Type-check without emitting
npm test                 # Run tests

npm run prisma:generate  # Regenerate Prisma client after schema changes

# Run only after explicit approval and migration review:
npm run prisma:migrate   # Apply approved migrations in production

# Modifies database data. Requires explicit owner approval, confirmation of
# the target database, and review of the seed script before execution:
npm run prisma:seed      # Seed the database

# Prisma Studio is read-only by default. No data may be created, edited,
# or deleted without separate explicit approval:
npm run prisma:studio    # Open Prisma Studio GUI
```

### Web (`apps/web/`)

```bash
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Production build
npm run typecheck        # Type-check
npm test                 # Run tests
```

### Infrastructure

```bash
# Start PostgreSQL + Redis for development
docker compose -f docker-compose.dev.yml up -d

# Full production stack
docker compose up -d

# Health check
curl http://localhost:3001/api/health
```

## Architecture

### Monorepo Layout

```
/
├── apps/api/            ← NestJS backend (PostgreSQL via Prisma)
│   ├── src/
│   │   ├── common/      ← guards, decorators, interceptors, tenant context
│   │   └── modules/     ← feature modules (count is dynamic — see apps/api/src/modules/)
│   └── prisma/          ← schema.prisma + migrations/
├── apps/web/            ← Next.js 15 frontend (App Router)
│   ├── app/             ← routes: (auth)/, (client)/, (workspace)/
│   └── src/
│       ├── api/         ← API client layer
│       ├── components/  ← domain-driven component folders
│       ├── lib/         ← utilities
│       ├── i18n/        ← translations
│       └── security/    ← security helpers
├── docs/                ← all specs and sprint documentation
└── packages/            ← shared config, utilities, and types only
```

The `packages` directory must never become a parallel application or runnable service.

### API Module Pattern

Every feature follows the same structure inside `apps/api/src/modules/<feature>/`:
- `<feature>.module.ts` — registers providers and imports
- `<feature>.controller.ts` — HTTP routes
- `<feature>.service.ts` — business logic
- `<feature>.repository.ts` — Prisma data access
- `dto/` — request/response DTOs with `class-validator` decorators

Active backend modules are discovered directly from `apps/api/src/modules/` — do not maintain a fixed module count in these rules. New modules added to that directory are automatically part of the active backend.

### Multi-Tenancy

All data is scoped to a `Tenant`. Requests carry a `TenantContextModule` (request-scoped) that resolves the active tenant and enforces isolation at the Prisma query level. User membership roles are `OWNER | MANAGER | EMPLOYEE | CONTRACTOR | CLIENT`.

### Authentication Flow

1. First OWNER is created via the bootstrap endpoint (one-time).
2. Users register → status `PENDING_APPROVAL`.
3. OWNER approves → status `ACTIVE`, `TenantMembership` created.
4. Login returns a JWT access token + refresh token (stored in DB).
5. All protected routes use `JwtAuthGuard` + `@CurrentUser()` decorator.
6. Frontend stores the JWT in `localStorage` and sends `Authorization: Bearer <token>`.

### Frontend Routing

Next.js App Router with route groups:
- `(auth)/` — login, register, public pages
- `(client)/` — client portal
- `(workspace)/` — main application (requires auth)

## File Placement Rules

| File type | Location |
|---|---|
| Frontend pages/routes | `apps/web/app/` |
| Frontend components | `apps/web/src/components/` |
| Backend feature module | `apps/api/src/modules/<feature>/` |
| Backend DTOs | `apps/api/src/modules/<feature>/dto/` |
| Backend shared/common | `apps/api/src/common/` |
| Prisma schema + migrations | `apps/api/prisma/` |
| Documentation | `docs/` |

**Root directory:** Existing tracked project-wide configuration, Docker files, documentation, and approved maintenance scripts may remain at root. New application code must go only under `apps/api` or `apps/web`. New documentation must go under `docs`. New Prisma and migration files must go under `apps/api/prisma`. Random or generated files must not be added to root. Do not maintain a hardcoded exhaustive list of root files.

**Root legacy directories:** The root-level directories `app/`, `components/`, `lib/`, and `styles/` are **not part of active MAOS and do not exist in the repository**. Do not recreate them. Application code belongs under `apps/api` or `apps/web` only.

## Environment

The project uses the following environment file structure:

- **Root `.env`** — local ignored file containing Docker/runtime secrets. Never commit, print, or copy its contents.
- **`apps/api/.env.example`** — safe development template; copy to `apps/api/.env` and fill in values locally.
- **`apps/api/.env.production.example`** — safe production template for VPS deployment.
- Real secrets must never be committed, printed, copied into reports, or exposed in any form.

## Database Safety Rules

The following operations are permanently forbidden unless explicitly approved by the project owner after a dedicated review:

- Never run `prisma db push`.
- Never run `prisma migrate dev`.
- Never run `prisma migrate reset`.
- Never delete or recreate the current database.
- Never modify an existing migration directory or its `migration.sql`.
- Never create a baseline migration without a separately approved baseline strategy.
- A baseline migration must not simply be appended after existing migrations — its timestamp and structure must be selected only after a dedicated read-only Prisma migration-history audit.
- Existing migration history and the current `_prisma_migrations` table state must be inspected before selecting a baseline timestamp or structure.
- Never run `prisma seed` or any data-mutating script without explicit owner approval.
- Never use Prisma Studio to create, edit, or delete data without explicit owner approval.

## SQL Backup Files

Local SQL backup files such as `backup_before_tasks_phase1_*.sql` are local safety artifacts:

- They must remain listed in `.gitignore` and must never be committed to the repository.
- They must not be edited or moved.
- They must not be used as a source of truth for schema state.

## Approved External Backup

One owner-approved external safety backup exists at:
`/Users/jihadhilal/Documents/MAOS_BEFORE_CLEANUP_BACKUP_20260715`

- This is not an active project root.
- Claude must not modify, delete, rename, move, or work inside it.
- No new external backup directory may be created without explicit owner approval.

## Task Protocol

1. Read the existing structure before making changes.
2. Update existing files rather than creating new ones.
3. Show a plan and wait for approval before making changes.
4. End every task with a file-change report listing modified, created, moved, and deleted files with reasons.
