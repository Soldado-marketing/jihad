# MAOS — Developer Handoff

**Date:** 2026-07-15
**Companion document:** `docs/MAOS_CURRENT_STATE_AUDIT.md` (full evidence and classifications — read it before changing anything)

---

## 1. What MAOS is

MAOS (Marketing & Operations System, project codename "codex marketing platform") is a **multi-tenant** operations platform for a services business: projects, Kanban tasks, CRM (leads → opportunities → meetings → follow-ups), files, approvals, chat, notifications, voice notes, finance (invoices/payments/revenue/costs), dashboards, reports, and a restricted client portal.

- Backend: **NestJS 11** (`apps/api`, port 3001, prefix `/api`), PostgreSQL 15 via **Prisma 6**, JWT auth.
- Frontend: **Next.js 15 App Router** (`apps/web`, port 3000), Tailwind, framer-motion.
- One tenant currently in use: slug `soldado-services`.

## 2. Current status (one paragraph)

Local-development MVP, **runtime-verified on the owner's machine on 2026-07-15 after Tasks Phase 1 + 2**: `docker compose build api web` succeeded (including a no-cache web build), both containers were recreated, and `GET http://localhost:3001/api/health` returned HTTP 200 `{"service":"maos-api","status":"ok"}`. Auth (register → owner approval → login), admin user management, projects, and the Tasks Kanban (including drag persistence after refresh, re-verified) persist to PostgreSQL. Everything else is implemented against the real database but largely untested. There is **no file upload** (metadata records only), **no automation engine**, transcription/AI/realtime are explicit placeholders, and the reports "run" is stubbed. **Not production ready.** Full breakdown in the audit document §7–§9.

## 3. Active folders — and what to ignore

| Path | Role |
|---|---|
| `apps/api` | ✅ Backend (active) |
| `apps/web` | ✅ Frontend (active) |
| `apps/api/prisma` | ✅ Schema + 4 migrations |
| `docs/` | Specs, sprint docs, this handoff |
| `apps/worker` | ⚠️ **Empty** — reserved, no code, no Docker service |
| `packages/*` | ⚠️ **Empty** placeholders |
| root `app/`, `components/`, `lib/`, `styles/`, `middleware.ts`, root `package.json` etc. | ⛔ **A different legacy project** (`sh-investments-social-workflow`). MAOS does not import it. Do not touch, do not delete without owner approval. |
| `Antigravity `, `claude-files/` | ⛔ Tooling artifacts |
| `backup_before_tasks_phase1_20260711_160819.sql` | ⛔ Real-data DB backup (pre-Phase-1). Never commit; never restore over the live DB without explicit instruction |

## 4. How to run locally

```bash
# 1. Infrastructure
docker compose -f docker-compose.dev.yml up -d     # postgres:5432 + redis:6379

# 2. API
cd apps/api
cp .env.example .env                                # fill DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm install --legacy-peer-deps                      # plain `npm ci` FAILS (see §11)
npm run prisma:generate
npm run dev                                         # http://localhost:3001/api/health

# 3. Web
cd apps/web
npm install --legacy-peer-deps
npm run dev                                         # http://localhost:3000
```

Full Docker stack: `docker compose up -d` (builds api+web images). Migration runner for the Docker DB: `./run_migrations.sh` (uses `prisma migrate deploy` inside a builder image — safe, idempotent).

Dev DB credentials (compose): user `maos`, password `maos_password`, db `maos_db`.

## 5. Database setup & migration history — READ CAREFULLY

The live database schema was originally created with `prisma db push` (no init migration exists). The migrations directory contains **only incremental migrations**, and their state in the live local database was **verified on 2026-07-15**:

1. `20240101000000_add_password_hash` — **baselined** (recorded, verified)
2. `20260612000000_add_public_registration_approval` — **baselined** (recorded, verified)
3. `20260703000000_add_missing_relations` — **baselined** (recorded, verified)
4. `20260711000000_add_sort_order_labels` — **applied** (verified; Tasks Phase 1: `sortOrder`, `Label`, `TaskLabel` + backfill)

Consequences:

- ✅ The **existing** local DB works with `prisma migrate deploy`.
- ❌ A **fresh** database cannot be built from migrations alone — you must first create the base schema (either `prisma migrate diff` to generate an init migration, or `db push` for throwaway envs).
- ⚠️ `migration_lock.toml` is missing from `prisma/migrations/` — recreate it (`provider = "postgresql"`) with the owner's approval.
- The generated Prisma client has historically lagged the schema — hence `(prisma as any)` casts in `auth.service.ts` / `admin-users.service.ts`. After `prisma generate`, these casts can be removed incrementally.

## 6. Environment variables (names only)

API (`apps/api/.env.example`): `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `REDIS_URL`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `OPENAI_API_KEY`, `WEB_URL`, `PORTAL_URL`. Compose additionally passes `APP_URL`.

Web: `NEXT_PUBLIC_API_URL` (baked at build time).

Notes: S3\_\*, OPENAI\_\*, REDIS\_\* are currently **unused by code** (no S3 SDK, no OpenAI client, no Redis client installed). SMTP is used by `MailService` and no-ops gracefully when unset. `WEB_URL` is **ignored** by CORS (hardcoded — see Known bugs).

## 7. Confirmed features (owner-tested and/or code-verified)

- Bootstrap first OWNER (`POST /api/auth/bootstrap`, one-time), public registration with tenant slug, owner approval/rejection in `/dashboard/admin/users/requests`, login with status gates, logout / logout-all, DB-backed sessions with immediate revocation.
- Projects CRUD; Settings (profile read/update).
- Tasks: **Phase 2 is the active frontend build** (runtime-confirmed 2026-07-15). Kanban with drag-across-columns status change persisting after refresh (manually re-verified on the rebuilt stack); task create; new Task Modal manually verified to display **Add block**, **collapsible Checklist**, **collapsible Attachments**, with the old Comments placeholder removed (edit fields, checklist via subtasks, labels create/assign/remove, internal notes, metadata attachments, delete).
- All list/detail pages fetch real API data; permission guard (`JwtAuthGuard` + DB-backed `PermissionGuard`) on all business endpoints; tenant isolation on every repository.

## 8. Incomplete / placeholder features

- **Files:** metadata registration only — no binary upload, download, preview, or version endpoints.
- **Tasks:** `/tasks/reorder` + `sortOrder` fully implemented server-side, **not called by the UI** (drag persists status only); Calendar view is a placeholder; Activity section shows only created/updated dates.
- **Voice:** notes are metadata; transcription and AI task-extraction are placeholder services returning canned text (by design, gated for human review).
- **Reports:** definitions/runs persist but the run engine returns stubbed results (`status: "PLACEHOLDER"`).
- **Sessions/Devices/Login-history endpoints:** return static placeholder JSON and have **no auth guards** (LoginHistory rows are written by the auth flow, but the read endpoint doesn't query them).
- **Realtime/chat:** no websockets — chat is request/response only.
- **Automation engine (Phase 10 docs), payroll, BI:** not implemented at all; docs are plans.
- Frontend **token refresh flow missing** — refresh token stored but never used.
- Fine-grained visibility scopes (`ASSIGNED_ITEMS_ONLY` etc.) not enforced — only the coarse role matrix.

## 9. Known bugs / defects

1. **CORS hardcoded** to `http://localhost:3000` in `apps/api/src/main.ts` — ignores `WEB_URL`. Breaks any deployed frontend.
2. **Forced logout every 15 minutes** (`JWT_EXPIRES_IN=15m` + no refresh usage in `apiFetch`).
3. `npm ci` fails in `apps/api` (`@nestjs/config@3.3.0` peer-conflicts with Nest 11) — everything must use `--legacy-peer-deps`.
4. JWT secret falls back to `'changeme'` in `jwt.strategy.ts` if env is missing.
5. API Dockerfile comment claims migrations run at start — they don't (manual via `run_migrations.sh`).
6. Static sprint baseline tests: 43/104 fail in `apps/api`, 3/53 in `apps/web` (stale baselines, see audit §14).
7. `*.spec.ts` unit tests exist but no test runner (jest) is installed — they never run.
8. Old components `task-kanban-preview.tsx`, `task-list.tsx` are dead code; `/tasks/[id]` still uses the pre-modal detail UI.

## 10. Do-NOT-do warnings

- **Do not** run `prisma migrate dev`, `prisma db push`, or re-apply/recreate the four existing migrations against the live DB.
- **Do not** run `git reset --hard`, `git clean`, or `git checkout .` — 302 paths of uncommitted work (the whole current app) live only in the working tree.
- **Do not** commit `.env`, the `backup_before_tasks_phase1_*.sql` dump, or build logs.
- **Do not** modify or delete the root legacy project (`app/`, `components/`, `lib/`, `styles/`, root configs) without explicit owner approval.
- **Do not** rename files/folders/modules/APIs — project rule (`PROJECT_RULES.md`).
- **Do not** treat metadata file registration as upload, or placeholder endpoints as features.
- **Do not** trust `docs/audit/MAOS_FULL_IMPLEMENTATION_GAP_REPORT.md` — it pre-dates the real auth/persistence work and is wrong about current state.

## 11. Suggested first tasks (in order)

1. **Commit the working tree** (owner approval first): add `backup_*.sql` to `.gitignore`, review the 81 untracked paths, commit in logical chunks, push.
2. ~~Rebuild images to confirm current code builds~~ — **done 2026-07-15**: `docker compose build api web` succeeded post-Phase-1/2 (incl. no-cache web build), containers recreated, health HTTP 200.
3. Fix CORS (env-driven origins) + add `@nestjs/throttler` and helmet.
4. Implement frontend refresh-token flow in `apps/web/src/lib/fetch.ts`.
5. Resolve the `@nestjs/config` peer conflict (upgrade to a Nest-11-compatible version) so `npm ci` works cleanly.
6. Create a baseline init migration for fresh environments (`prisma migrate diff --from-empty --to-schema-datamodel`), restore `migration_lock.toml`.
7. Wire Kanban drag-and-drop to `PATCH /tasks/reorder` (backend is ready) for within-column ordering.
8. Guard or remove the placeholder `sessions`/`devices`/`login-history`/`tenant-context` endpoints.
9. Configure jest for the three existing `.spec.ts` files; update or retire the 46 failing static baselines; add CI.
10. Decide file-storage architecture (S3 vs local volume) before building upload.

## 12. QA checklist (manual, prioritized)

1. Auth lifecycle: register → pending → approve → login; reject → blocked; suspend mid-session; logout-all; observe 15-min expiry behavior.
2. Tasks end-to-end (create/edit/drag/refresh/checklist/labels/delete) — two browsers, two users.
3. Cross-tenant isolation: with a second tenant, probe every `GET /:id` endpoint using the other tenant's IDs (expect 404).
4. Client portal with a CLIENT role account: only client-visible data.
5. CRM CRUD each entity; invoice status transitions; payment recording; finance summary math.
6. Approvals decision flow; chat channels/messages; notifications unread counts.
7. Direct-URL access logged out, page refresh on every route, new-tab session reuse.

## 13. Production checklist

Migrations baseline & auto-deploy · commit/CI/CD · CORS + helmet + rate limiting · refresh flow + consider httpOnly cookie storage · real SMTP creds + `APP_URL` · file/voice storage implementation · domain/TLS + `NEXT_PUBLIC_API_URL` build config · scheduled DB backups + restore drill · monitoring/structured logging/error tracking · enforce visibility scopes · remove `changeme` fallback · secrets management.

## 14. Backup information

`backup_before_tasks_phase1_20260711_160819.sql` (repo root, ~129 KB): `pg_dump` 15.18 data dump of all 40 pre-Phase-1 tables, taken 2026-07-11 immediately before the `add_sort_order_labels` migration. It does **not** include the `_prisma_migrations` table and does **not** contain `sortOrder`/`Label` structures. Restoring it would roll the schema/data back behind Phase 1 — do not restore casually. No other backups exist in the repo; no scheduled backups are configured.

## 15. Git status summary (2026-07-15)

- Branch `main`; remote `origin/main`; last commit `d591de7` (2026-06-06, "Add task board and client file preview controls"); 6 commits total.
- Working tree: 220 modified, 81 untracked, 1 deleted — effectively the entire MAOS implementation is uncommitted.

## 16. Exact next steps

1. Read `docs/MAOS_CURRENT_STATE_AUDIT.md`.
2. Get owner approval → commit & push the working tree (§11.1).
3. Smoke-test the running stack per the QA checklist (§12) — the rebuild itself was already verified on 2026-07-15.
4. Fix the four production-blocking defects: CORS, refresh flow, rate limiting, npm peer conflict.
5. Establish the migration baseline strategy before any new schema change — **no fresh-database baseline migration exists** (§5).
6. Only then start feature work (recommended: finish Tasks reorder wiring, then real file upload).

## 17. Recommended Handoff File Set

Hand over exactly this set.

**Include:**

- `apps/api`
- `apps/web`
- `docs`
- `docker-compose.yml`
- `docker-compose.dev.yml`
- `run_migrations.sh`
- `README.md`
- `CLAUDE.md`
- `PROJECT_RULES.md`
- `HANDOFF_PRODUCTION_READINESS.md`
- `.gitignore`

**Exclude:**

- `.env` (all variants — secrets)
- backup SQL files (`backup_before_tasks_phase1_*.sql` — real user data)
- logs (`api-build.log`, `web-build.log`, any `*.log`)
- `node_modules`
- `.next`
- `dist`
- root legacy `sh-investments-social-workflow` files (root `app/`, `components/`, `lib/`, `styles/`, `middleware.ts`, root `package.json` / `package-lock.json` / `tsconfig.json` / `next.config.ts` / `tailwind.config.ts` / `postcss.config.js` and related root configs)
- `Antigravity `
- `claude-files/`
