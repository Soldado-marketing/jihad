# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

- **Project name:** MAOS — Soldado Marketing Platform (Marketing & Operations System)
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

npm run prisma:generate       # Regenerate Prisma client after schema changes
npm run prisma:migrate:dev    # ONLY on a disposable local database, to create a migration in an approved schema task — never against a shared or production database
npm run prisma:migrate        # Apply migrations in production
npm run prisma:seed           # Seed the database
npm run prisma:studio         # Open Prisma Studio GUI
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
│   │   └── modules/     ← 42 feature modules
│   └── prisma/          ← schema.prisma + migrations/
├── apps/web/            ← Next.js 15 frontend (App Router)
│   ├── app/             ← routes: (auth)/, (client)/, (workspace)/
│   └── src/
│       ├── api/         ← API client layer
│       ├── components/  ← domain-driven component folders
│       ├── lib/         ← utilities
│       ├── i18n/        ← translations
│       └── security/    ← security helpers
├── scripts/             ← backup, restore and restore-rehearsal scripts
└── docs/                ← Product Blueprint, execution ledger, specs, ADRs
```

### API Module Pattern

Every feature follows the same structure inside `apps/api/src/modules/<feature>/`:
- `<feature>.module.ts` — registers providers and imports
- `<feature>.controller.ts` — HTTP routes
- `<feature>.service.ts` — business logic
- `<feature>.repository.ts` — Prisma data access
- `dto/` — request/response DTOs with `class-validator` decorators

The 42 modules: `admin-users`, `ai-provider`, `approvals`, `audit`, `auth`, `chat`, `client-portal`, `collaboration`, `crm`, `dashboards`, `devices`, `file-versions`, `files`, `finance`, `follow-ups`, `health`, `invites`, `invoices`, `labels`, `leads`, `login-history`, `mail`, `meetings`, `memberships`, `notifications`, `opportunities`, `payments`, `permissions`, `prisma`, `projects`, `realtime`, `reports`, `sessions`, `storage`, `subtasks`, `tasks`, `tenant-context`, `tenants`, `transcription`, `users`, `voice-notes`, `voice-to-task`.

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

**Root-level files only:** `CLAUDE.md`, `PROJECT_RULES.md`, `README.md`, `.gitignore`, `docker-compose.yml`, `docker-compose.dev.yml`, `setup.sh`, `run_migrations.sh`. There is no root `package.json`: each app has its own.

**No root application:** the old root Next.js app was removed. Do not recreate root-level `app/`, `components/`, `lib/` or `styles/` folders; all code lives in `apps/api` and `apps/web`.

## Environment

Copy `.env.example` to `.env` and fill in at minimum:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` and `JWT_REFRESH_SECRET`

Docker Compose dev defaults: `postgresql://maos:maos_password@localhost:5432/maos_db`

## Product Blueprint (mandatory)

Before planning or executing any MAOS task, read `docs/MAOS_PRODUCT_BLUEPRINT.md` (canonical target product architecture) and validate the task against it (§30). If the task conflicts with an architecture invariant, security invariant, domain ownership rule or phase dependency, STOP and return `BLUEPRINT_CONFLICT` instead of implementing. Never modify the Blueprint inside an unrelated implementation task. One MAOS task at a time.

## Task Protocol

1. Read the existing structure before making changes.
2. Update existing files rather than creating new ones.
3. Show a plan and wait for approval before making changes.
4. End every task with a file-change report listing modified, created, moved, and deleted files with reasons.
