# MAOS — Current State Audit

**Date:** 2026-07-15
**Scope:** Full read-only technical audit of `/Users/jihadhilal/Documents/claude`
**Prepared for:** Developer handoff
**Method:** Static code inspection, git inspection, migration/backup file analysis, static test execution. No files were modified, no migrations applied, no database touched.

**Environment limitation (important):** This audit ran in a sandboxed environment **without** access to the machine's Docker daemon, the running containers, PostgreSQL, or `localhost:3000/3001`. Everything marked **[RUNTIME-UNVERIFIED]** could not be re-tested live in the audit session itself.

**Runtime verification supplement (2026-07-15, owner's machine, after Tasks Phase 1 + Phase 2):** the following were verified live by the owner and upgrade earlier [UNKNOWN] items to **[VERIFIED-RUNTIME]**:

- `docker compose build api web` completed successfully; a **no-cache** web build also completed successfully.
- The API and Web containers were recreated successfully.
- `GET http://localhost:3001/api/health` → HTTP 200 `{"service":"maos-api","status":"ok"}`.
- The live local database records all four migrations: `20240101000000_add_password_hash`, `20260612000000_add_public_registration_approval`, `20260703000000_add_missing_relations` (all baselined) and `20260711000000_add_sort_order_labels` (applied).
- Tasks Phase 2 is the active frontend build; the new Task Modal displays **Add block**, a **collapsible Checklist**, **collapsible Attachments**, and the old Comments placeholder is removed.
- Task status drag persistence after refresh was manually re-verified.

These runtime facts do **not** change the structural findings below (in particular: there is still **no fresh-database baseline migration**).

Classification legend used throughout:

- **[VERIFIED]** — confirmed directly from code, git, migration SQL, backup dump, or a test executed during this audit
- **[LIKELY]** — strongly supported by evidence but not directly executed
- **[ASSUMPTION]** — stated in prior docs / owner context, not independently confirmed
- **[UNKNOWN]** — no evidence available in this session

---

## 1. Executive Summary

MAOS is a multi-tenant NestJS 11 + Next.js 15 marketing/operations platform. The current state is substantially better than the older gap report in `docs/audit/` claims, and substantially less finished than the sprint spec documents imply.

What is real: a working auth/registration/approval system with DB-backed sessions and audit logging, ~113 REST endpoints across 32 controllers with JWT + DB-backed permission guards, a fully tenant-scoped Prisma schema (42 models), and a frontend where **every page calls the real API — no mock data pages remain**. The Tasks module (Kanban + modal with checklist, labels, notes) is the most developed feature.

The five most important findings:

1. **[VERIFIED] Almost the entire application is uncommitted.** Last commit is `d591de7` (2026-06-06). 302 changed paths (220 modified, 81 untracked). One accidental `git reset`/`checkout` would destroy six weeks of work.
2. **[VERIFIED] There is no baseline migration.** The four migrations in `apps/api/prisma/migrations/` are incremental only; none creates the 40+ base tables. A fresh database **cannot** be built with `prisma migrate deploy`. The schema was historically created with `prisma db push` (per `HANDOFF_PRODUCTION_READINESS.md`, 2026-06-16). `migration_lock.toml` is also missing. (The **existing** local DB is fine: all four migrations are recorded/applied there — [VERIFIED-RUNTIME], see supplement above.)
3. **[VERIFIED] File upload does not exist.** The Files module registers **metadata only** (name, mimeType, links). There is no multer/multipart handling, no S3 SDK dependency in `apps/api/package.json`, no download, no preview, no version binaries. Attachments in the Task modal are metadata records.
4. **[VERIFIED] Tasks Phase 1 backend is live but half-unused by the frontend.** `PATCH /api/tasks/reorder` and `sortOrder` are implemented server-side (atomic, tenant-checked), but no frontend code calls `reorder` — drag & drop persists **status only** via `PATCH /tasks/:id`. Manual within-column ordering is not wired.
5. **[VERIFIED] The repo root is a different project.** Root `package.json` is `sh-investments-social-workflow` (IMAP email intake, S3, SQLite). Root `app/`, `components/`, `lib/`, `styles/`, `middleware.ts` belong to it. `apps/web` does not import any of it (verified via tsconfig paths and import scan).

---

## 2. Architecture (as implemented)

- **Backend:** NestJS 11, `apps/api`, port 3001, global prefix `/api`. Module pattern: controller → service → repository → Prisma. 41 module directories (CLAUDE.md says 39; `labels` and `login-history` were added).
- **Frontend:** Next.js 15 App Router, `apps/web`, port 3000. Route groups `(auth)`, `(client)`, `(workspace)`. All data via `apiFetch` (`apps/web/src/lib/fetch.ts`) with Bearer token from localStorage.
- **DB:** PostgreSQL 15 (Docker), Prisma 6.x. **Redis:** in compose and env, but no Redis client dependency exists in `apps/api/package.json` — Redis is currently **unused by code** [VERIFIED].
- **Multi-tenancy:** every business model carries `tenantId`; `tenantId` is taken from the verified JWT payload (not from headers — Sprint 13 removed header-based context per comment in `permission.guard.ts`). All repositories inspected filter by `tenantId`.
- **AuthZ:** `JwtAuthGuard` (passport-jwt + per-request DB session validation) + `PermissionGuard` with `@RequirePermission` decorators; decisions are DB-backed against `TenantMembership` role, with a static role→resource matrix in `permission.service.ts`.

---

## 3. Repository structure and legacy files

### Active [VERIFIED]

| Path | Status |
|---|---|
| `apps/api` | Active backend. Docker build context. |
| `apps/web` | Active frontend. Docker build context. |
| `apps/worker` | **Empty directory.** No code, no Docker service. Expected-active assumption is wrong. |
| `packages/` (`config`, `shared`, `types`) | **Empty** (only `.DS_Store`). Placeholder monorepo dirs. |
| `docs/` | ~60+ documents (see §11). |

### Legacy / foreign / artifacts [VERIFIED]

| Path | Verdict | Evidence |
|---|---|---|
| `package.json` (root) | **Different project** — `sh-investments-social-workflow` (imapflow, mailparser, better-sqlite3, @aws-sdk, archiver) | root `package.json` |
| `app/`, `components/`, `lib/`, `styles/`, `middleware.ts`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `postcss.config.js`, `package-lock.json`, `next-env.d.ts`, `.eslintrc.json`, `.prettierrc` (root) | Belong to that legacy project. **Not imported by MAOS**: `apps/web/tsconfig.json` maps `@/*` → `apps/web/src/*`; import scan found zero references into root dirs | grep of `apps/web/app` + `apps/web/src` |
| `middleware.ts` (root) | Legacy cookie-based auth for the old project. **MAOS `apps/web` has NO middleware.ts** — route protection is client-side only | file inspection |
| `Antigravity ` (note trailing space in dir name) | Editor artifact — contains only `.claude/settings.local.json` | `find` |
| `claude-files/` | Stale duplicate `CLAUDE.md` (2026-06-08) | file inspection |
| `api-build.log`, `web-build.log` | Docker build logs dated 2026-06-15, both ending `Image ... Built` — evidence both images built successfully **at that date** | log tails |
| `backup_before_tasks_phase1_20260711_160819.sql` | pg_dump 15.18 data backup, 40 tables. **Does not include `_prisma_migrations`** and pre-dates Phase 1 (no `sortOrder`, no `Label`) | grep of dump |
| `run_migrations.sh` | Safe migrate-deploy runner via Docker (reads `DATABASE_URL` from the api container, never prints it). Reasonable to keep | file inspection |
| `setup.sh`, `HANDOFF_PRODUCTION_READINESS.md` (root) | Root-level; the handoff doc **differs** from `docs/HANDOFF_PRODUCTION_READINESS.md` (duplicate with drift) | `diff -q` |

**CLAUDE.md inaccuracies found [VERIFIED]:** says "39 modules" (41 exist); says copy `.env.example` at root (no root `.env.example` exists — it lives at `apps/api/.env.example`); root docker-compose dev DB name in CLAUDE.md is `maos_db` (matches compose) but `run_migrations.sh` health-checks database `maos` (mismatch — cosmetic, pg_isready only).

---

## 4. Git state [VERIFIED]

- Branch `main`, remote `origin/main` exists.
- History: 6 commits, 2026-06-01 → 2026-06-06 (`ce63715` … `d591de7`). Nothing committed since.
- `git status --porcelain`: **302 paths** — 220 modified, 81 untracked, 1 deleted (`app/login/actions.ts`).
- Untracked includes the entire migrations dir, Dockerfiles, docker-compose files, seed.ts, the labels/mail/admin-users modules, all Phase-2 task components, docs, and the DB backup.
- `.gitignore` correctly excludes `.env*`, `node_modules`, `dist`, logs — but note `*.log` means the two build logs at root are ignored, while the **DB backup .sql is NOT ignored** and would be committed as-is (it contains real user data rows).

**Risk:** the working tree is the only copy of the current application. Highest-priority action after this audit: commit (excluding the backup/secrets) — requires your approval, not done in this audit.

---

## 5. Docker and build status

- Compose (prod): `postgres:15-alpine`, `redis:7-alpine`, `api` (context `./apps/api`), `web` (context `./apps/web`). Healthchecks on pg/redis; api depends on both. No worker service. [VERIFIED from files]
- Compose (dev): pg + redis only. [VERIFIED]
- Dockerfiles: multi-stage, `npm ci --legacy-peer-deps`, non-root user, web uses Next `output: 'standalone'`. API Dockerfile comment says "Run migrations then start" but `CMD` runs only `node dist/main.js` — **migrations are not run on container start** (they were run manually via `run_migrations.sh`). [VERIFIED]
- **Dependency conflict [VERIFIED by execution]:** plain `npm ci` in `apps/api` fails with `ERESOLVE` — `@nestjs/config@3.3.0` requires `@nestjs/common@^9||^10`, found `11.1.24`. `--legacy-peer-deps` is mandatory everywhere. Upgrading `@nestjs/config` to a v11-compatible major is the clean fix.
- `docker compose build api web`: **[VERIFIED-RUNTIME]** — completed successfully on the owner's machine after Tasks Phase 1/2, including a **no-cache** web build; API and Web containers were recreated successfully (2026-07-15 supplement). Earlier evidence: 2026-06-15 build logs.
- TypeScript typecheck: not executable in the audit sandbox, but the successful post-Phase-1/2 Docker builds (which run `tsc`/`next build`) confirm the current code compiles — **[VERIFIED-RUNTIME via build]**.
- API health: **[VERIFIED-RUNTIME]** — `GET http://localhost:3001/api/health` → HTTP 200 `{"service":"maos-api","status":"ok"}` after container recreation. Web response verified implicitly by owner's manual UI testing of the new Task Modal. Container logs were not captured in this audit — [UNKNOWN].

---

## 6. Database and Prisma

### Schema [VERIFIED]

`apps/api/prisma/schema.prisma` (1,172 lines, 42 models). Confirmed present:

- `Task.sortOrder Float?` + index `@@index([tenantId, sortOrder])`
- `Subtask.sortOrder Float?`
- `Label` (`@@unique([tenantId, name])`)
- `TaskLabel` (`@@unique([taskId, labelId])`, tenant-scoped indexes)

Design quality: consistent `tenantId` on every business model, composite `(tenantId, X)` indexes throughout, `onDelete: Cascade` from Tenant, unique constraints on natural keys (`Tenant.slug`, `User.email`, `Session.tokenHash`, `(tenantId, invoiceNumber)` etc.).

### Migrations [VERIFIED from files]

| Migration | Purpose |
|---|---|
| `20240101000000_add_password_hash` | `ALTER TABLE "User" ADD "passwordHash"` (2 lines) |
| `20260612000000_add_public_registration_approval` | UserStatus/Role enum values, VisibilityScope, MembershipPermission + RegistrationRequest tables |
| `20260703000000_add_missing_relations` | 6 FK constraints (FileAsset/VoiceNote/Invoice) |
| `20260711000000_add_sort_order_labels` | sortOrder columns + backfill, Label, TaskLabel, index |

**Critical gaps:**

1. **No init/baseline migration** — nothing creates `Tenant`, `User`, `Task`, … A fresh DB from `migrate deploy` alone is impossible. [VERIFIED]
2. **`migration_lock.toml` missing** from the migrations directory. [VERIFIED]
3. Migration state in the live local DB: **[VERIFIED-RUNTIME]** (2026-07-15 supplement) — `20240101000000_add_password_hash`, `20260612000000_add_public_registration_approval`, `20260703000000_add_missing_relations` recorded as **baselined**, `20260711000000_add_sort_order_labels` **applied**. This resolves the earlier [UNKNOWN]. Note: this describes the existing local DB only — the fresh-database problem in item 1 remains.
4. **Drift indicators:** `(this.prisma as any)` casts in `auth.service.ts` / `admin-users.service.ts` with comments about a "stale Prisma-generated type" — the generated client has at times lagged the schema. Regenerate + remove casts is cleanup work.

### Backup [VERIFIED]

`backup_before_tasks_phase1_20260711_160819.sql` — pg_dump 15.18, full data dump of 40 tables, pre-Phase-1 schema. Contains real user/tenant rows. Keep out of git.

---

## 7. Backend inventory

### Endpoint inventory (113 routes, 32 controllers)

Guard column: **J** = JwtAuthGuard, **P** = PermissionGuard + `@RequirePermission` on every route of that controller (verified counts match route counts), — = none.

| Module | Routes | Guards | Persistence | Status |
|---|---|---|---|---|
| auth | POST register, bootstrap, login, refresh, logout*, logout-all*, GET me* (*=J) | public + J | Prisma (User, Session, RegistrationRequest, AuditEvent) | **Implemented; login/registration/approval previously tested by owner** |
| admin-users | GET requests, POST approve/reject, suspend/reactivate, PATCH role | J (+OWNER check in service) | Prisma, transactional, audited | Implemented; approval flow previously tested |
| users | GET me, GET members, PATCH me | J | Prisma | Implemented |
| tasks | GET/POST /tasks, PATCH reorder, GET/PATCH/DELETE :id | J+P | Prisma | Implemented (reorder unused by UI) |
| subtasks | GET/POST /tasks/:id/subtasks, PATCH/DELETE /subtasks/:id | J+P | Prisma | Implemented |
| labels | CRUD /labels, POST/DELETE /tasks/:taskId/labels/:labelId | J+P | Prisma | Implemented |
| projects | full CRUD | J+P | Prisma | Implemented |
| leads / opportunities / meetings / follow-ups | full CRUD each | J+P | Prisma | Implemented but lightly tested |
| collaboration (notes) | full CRUD | J+P | Prisma | Implemented |
| files | list/create/get/update/delete | J+P | Prisma **metadata only** | **Partial — no binary upload/download** |
| file-versions | **no controller** | — | model only | **Missing (schema + module shell only)** |
| approvals | list/create/get/decide | J+P | Prisma | Implemented, untested |
| chat | channels list/create, messages list/create | J+P | Prisma | Implemented (no realtime — polling only) |
| notifications | list, unread-count, mark read/all | J | Prisma | Implemented |
| invoices (+client) | list/create/get/status; client read-only | J+P | Prisma | Implemented; no line editing/delete |
| payments (+client) | list/create/get; client list | J+P | Prisma | Implemented; no update/delete |
| finance | summary/revenue/costs | J+P | Prisma aggregates | Implemented, untested |
| dashboards | workspace-summary, client-summary | J+P | Prisma aggregates | Implemented |
| reports | list/create/get/run | J+P | Prisma; `ReportRun.status` default `"PLACEHOLDER"` | **Partial — run engine is stubbed** |
| voice-notes | list/create/get/delete | J | Prisma metadata (no audio upload) | **Partial** |
| voice-to-task | draft create/list/get/confirm | J+P | Prisma | Implemented over **placeholder** transcription/AI |
| transcription | (no controller) | — | — | **Placeholder provider** (static text) |
| ai-provider | (no controller) | — | — | **Placeholder extraction** |
| realtime | (no controller) | — | — | **Placeholder gateway** |
| sessions | GET current, POST revoke | **none** | **none — returns static placeholder JSON** | **Placeholder, unauthenticated** |
| devices | GET / | **none** | placeholder JSON | **Placeholder, unauthenticated** |
| login-history | GET / | **none** | placeholder JSON (model IS written by auth flow, but this endpoint doesn't read it) | **Placeholder, unauthenticated** |
| tenant-context | GET / | **none** | echoes headers | Diagnostic remnant of Sprint 1B header-based context — candidate for removal |
| health | GET /api/health | none (intentional) | — | Implemented |
| invites | POST accept | public (by design) | Prisma | Implemented, untested end-to-end |

Notes:

- DTO validation: global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` [VERIFIED in `main.ts`] + class-validator DTOs on inspected modules (auth, tasks, subtasks). Mass assignment is well mitigated.
- Error handling: standard Nest exceptions (`NotFoundException` after tenant-scoped lookups) — consistent in inspected services.
- Audit logging: **real** (`auditEvent.create`) in auth, registration, admin-users. Business modules (tasks, files, CRM…) do **not** write audit events — coverage is partial. `createAuditEventPlaceholder` still used by the realtime placeholder.
- No raw SQL anywhere (`$queryRaw`/`$executeRaw` grep: zero hits) — injection surface minimal. [VERIFIED]

---

## 8. Frontend inventory

49 `page.tsx` routes. **Every data page uses `apiFetch` against the real API — no mock-data pages remain** [VERIFIED by per-page grep]. The old gap report's claim of "static preview data" is obsolete.

| Area | Routes | API | Notes |
|---|---|---|---|
| Auth | `/auth/login`, `/auth/register`, `/auth/invite`, `/unauthorized` | direct `fetch` to `/auth/*` | login stores tokens+user+tenant in localStorage; register posts with tenantSlug |
| Dashboard | `/dashboard` | workspace-summary, unread-count | real |
| Admin | `/dashboard/admin/users/requests` | admin/users/requests + approve/reject | real; previously tested |
| Tasks | `/tasks`, `/tasks/[id]` | tasks, projects, members, files, labels | Phase 2 UI **active** (see §9) |
| Projects | `/projects`, `/projects/[id]` | projects CRUD | real |
| CRM | `/crm`, leads, opportunities, meetings, follow-ups (+detail pages) | full CRUD | real |
| Files | `/files`, `/files/[id]` | files CRUD | **metadata register/delete only — no upload control** |
| Approvals | `/approvals`, `/approvals/[id]` | approvals + decide | real |
| Chat | `/chat` | channels/messages | real, no websocket — manual reload |
| Collaboration | `/collaboration` | notes CRUD | real |
| Notifications | `/notifications` | list/read | real |
| Voice | `/voice`, `/voice/[id]`, task-drafts | voice-notes, drafts | real API over placeholder transcription |
| Finance | `/finance`, revenue, costs, invoices(+id), payments | finance/invoices/payments | real |
| Reports | `/reports`, `/reports/[id]` | reports + run | real API; run result is stubbed server-side |
| Client portal | `/client/*` (projects, tasks, invoices, payments) | client-scoped endpoints | real |
| Preview | `/dashboard/neural-hub-preview` | none | static demo page (kept intentionally?) |

Cross-cutting [VERIFIED]:

- **Route protection is client-side only** — no `middleware.ts` in `apps/web`; `(workspace)/layout.tsx` redirects in `useEffect` when no token. Direct URL access briefly renders shell, then redirects; API data itself stays protected server-side.
- **401 handling:** `apiFetch` clears session and hard-redirects to `/auth/login`.
- **Refresh token is stored but NEVER used** — no code calls `/auth/refresh`. With `JWT_EXPIRES_IN=15m`, users are force-logged-out every 15 minutes. This is the most user-visible auth gap.
- Loading/error states exist on inspected pages (tasks, settings, chat, files).
- **Dead components [VERIFIED by import scan]:** `src/components/tasks/task-kanban-preview.tsx` and `src/components/tasks/task-list.tsx` are imported by nothing. `task-detail.tsx` (old UI) is still used by `/tasks/[id]` — the modal and the detail page coexist.

---

## 9. Tasks module deep audit

Phase-2 UI **is the active build**: `app/(workspace)/tasks/page.tsx` imports `KanbanBoard`, `ListView`, `CalendarView`, `TaskModal` [VERIFIED in code], and this was confirmed live on the running stack [VERIFIED-RUNTIME, 2026-07-15]. The new Task Modal was manually verified to display **Add block**, a **collapsible Checklist**, **collapsible Attachments**, with the old Comments placeholder removed.

| Feature | Classification | Evidence |
|---|---|---|
| Kanban board, drag across columns → status change | **Confirmed working** (owner-tested persistence after refresh; code path `PATCH /tasks/:id {status}`) | `kanban-board.tsx` handleDrop; owner runtime verification |
| Status persistence after refresh | **Confirmed working** (re-verified manually on the rebuilt stack, 2026-07-15) | owner runtime verification |
| List view | Implemented but untested | `list-view.tsx` |
| Calendar | **Placeholder** ("Coming in a future sprint") | `calendar-view.tsx` |
| Task creation (title/status/priority/assignee/project/due) | Implemented; creation was previously tested | tasks page NewTask panel |
| Task editing via modal (title, description, status, priority, dates, project, assignee) | Implemented but untested in detail | `task-modal.tsx` save → `PATCH /tasks/:id` |
| Description clearing with `null` | Implemented | `task-modal.tsx:303` sends `description: null` when empty; repo maps `undefined`-guarded so `null` clears |
| Task deletion | Implemented | modal `DELETE /tasks/:id` |
| **sortOrder backend** (reorder endpoint, atomic, tenant-verified, duplicate-ID rejection, backfill migration) | Implemented but **unused** | `tasks.repository.ts:148`, `reorder-tasks.dto.ts`, migration SQL |
| **sortOrder frontend** | **Missing** — zero calls to `/tasks/reorder`; `sortOrder` appears only in a type | repo-wide grep |
| Labels: create (name+color), assign, remove, filter by label | Implemented but untested | modal + `labels.controller.ts`; list filter `labelId` exists server-side |
| Checklist (= Subtasks): add, toggle DONE/TODO (optimistic w/ rollback), delete | Implemented but untested | modal lines 327–367 |
| Members (assignee picker from `/users/members`) | Implemented | tasks page |
| Priority / due dates | Implemented | DTOs + modal |
| Project assignment | Implemented | DTOs + modal |
| Attachments | **Partial / metadata-only** — "attachment" = POST `/files {name, taskId}`; no binary | modal `registerFile()` |
| Internal Notes | Implemented (list + create via `/collaboration/notes?resource…`) | modal loadNotes/addNote |
| Add Block menu | Partial — only `labels` and `notes` sections (`SectionKey = 'labels' | 'notes'`) | modal type |
| Activity section | **Placeholder** — renders only createdAt/updatedAt, no audit feed | modal lines 1033–1055 |
| Permissions | `@RequirePermission` on all 6 task routes; role matrix allows EMPLOYEE/CONTRACTOR task write | controllers + `permission.service.ts` |
| Tenant isolation | All queries tenant-scoped incl. reorder bulk verification | `tasks.repository.ts` |

---

## 10. Files module verdict

- Binary upload: **Missing** (no multer, no S3 dep, no endpoint).
- Metadata registration: **Implemented** (this is what the UI calls "adding a file/attachment").
- Preview: **Missing**. Download: **Missing**. Versioning: **Missing at API level** (models exist; `file-versions` module has no controller).
- Permissions: guarded (J+P). Task/project linking: implemented via `taskId`/`projectId` metadata fields.
- **Do not describe MAOS as having file upload.**

---

## 11. Authentication & session audit

Strengths [VERIFIED in code]:

- bcrypt cost 12; refresh tokens are 48-byte random, stored **hashed** (sha256) in `Session`; refresh rotation on use; JWT payload carries `sessionId` and **every request re-validates the session in DB** (revocation works immediately); status gates (PENDING/REJECTED/SUSPENDED/DISABLED) with audit events; neutral registration errors to prevent tenant/email enumeration; bootstrap endpoint hard-blocked once any OWNER exists; OWNER role checks server-side in admin service.

Gaps:

- Tokens in `localStorage` (XSS-exfiltratable; acceptable for MVP, flag for production).
- **Refresh flow unused by frontend** → forced logout at access-token expiry (15m).
- JWT secret fallback `'changeme'` in `jwt.strategy.ts` if env missing.
- No login rate limiting / lockout; no password complexity beyond min 8; no 2FA.
- Route protection client-side only (no Next middleware).
- Expired-token handling: works via 401 → redirect [code-verified]; new-tab behavior: works (localStorage shared) [LIKELY]; redirect loops: none found in code review (login page excluded from redirect).

---

## 12. Security findings

| Area | Finding | Severity |
|---|---|---|
| CORS | **Hardcoded `origin: ['http://localhost:3000']` in `main.ts`** — `WEB_URL` env is set in compose but ignored by code. Any deployed domain will fail CORS | High (prod blocker) |
| Rate limiting | None (`@nestjs/throttler` absent) | High for prod |
| Helmet/security headers | Not used in API; web has `poweredByHeader: false` only | Medium |
| Unauthenticated endpoints | `/api/sessions/*`, `/api/devices`, `/api/login-history`, `/api/tenant-context` have **no guards**; they return static placeholder JSON (no data leak today), but they are latent risk if ever implemented without adding guards | Medium |
| Tenant isolation | Strong: JWT-derived tenantId, all inspected repos scope by it; reorder verifies ID ownership in bulk; cross-tenant ID probing returns 404 via `findFirst({id, tenantId})` pattern | Good |
| Mass assignment | Mitigated by whitelist+forbidNonWhitelisted global pipe | Good |
| SQL safety | Prisma only, zero raw queries | Good |
| Secrets | `.env` at root contains only `JWT_SECRET`, `JWT_REFRESH_SECRET` (names verified, values not read). `.gitignore` covers `.env*`. **DB backup with real data sits unignored in repo root** | Medium |
| Logging | No token/password logging found in inspected services | Good |
| File security | N/A (no upload) — when implemented: needs type/size validation, AV scanning, signed URLs | — |
| Visibility scopes | `resource-scope.service.ts` returns `*_scope_not_implemented` for all roles — fine-grained visibility (ASSIGNED_ITEMS_ONLY etc.) is **not enforced**; only the coarse role matrix is | Medium |

---

## 13. Documentation consistency

- **Trustworthy (closest to reality):** root `HANDOFF_PRODUCTION_READINESS.md` (2026-06-16) — its verified/not-done split matches this audit, but it pre-dates Tasks Phase 1/2; Sprint 12/13 docs (registration/auth) describe what was actually built.
- **Outdated / do not trust for current state:** `docs/audit/MAOS_FULL_IMPLEMENTATION_GAP_REPORT.md` — claims auth is placeholder, repositories in-memory, frontend static. All three claims are now false [VERIFIED against code].
- **Plans, not implementation:** all `MAOS_*_PHASE_N.md` specs (AI ecosystem, automations/workflow engine Phase 10, BI Phase 11, finance/payroll Phase 8 beyond current CRUD…). No `automation` module exists in code — Phase 10 is entirely unimplemented [VERIFIED: module list].
- **Duplicates:** `HANDOFF_PRODUCTION_READINESS.md` exists at root **and** in `docs/` with different content (diff confirmed). Two `CLAUDE.md`-style rule files (root + `claude-files/`).
- **Unsupported claims found:** CLAUDE.md "39 modules" (41); API Dockerfile comment "run migrations then start" (it doesn't); compose exposes SMTP/S3 vars while no S3 code exists.
- **Developer should trust:** this audit + `MAOS_DEVELOPER_HANDOFF.md` first, then root HANDOFF doc for auth-flow history, then sprint-13 docs. Treat everything else as roadmap.

---

## 14. Testing

Executed during this audit [VERIFIED]:

```
apps/web:  node --test → 53 tests: 50 pass, 3 fail
apps/api:  node --test → 104 tests: 61 pass, 43 fail
```

- These are **static file-content assertions** (they read source files and assert strings/absence), not runtime tests. The failures are overwhelmingly **stale sprint baselines**: e.g. API baselines assert "deferred external integrations remain absent" (now false — mail/nodemailer exists), "safe placeholders" for dashboards (now real queries). They signal drift between sprint governance and code, **not necessarily broken features** — but each failure should be reviewed and baselines updated or retired.
- `*.spec.ts` unit tests exist (auth, permissions, admin-users) but **cannot run**: no jest/vitest is installed or configured; the `test` script only runs the `.mjs` files. [VERIFIED from package.json]
- No E2E tests, no CI (no `.github/`), no coverage.

### Prioritized manual QA checklist

1. Auth: bootstrap-blocked, register → pending → approve → login; reject → 403; suspend mid-session; logout-all; token expiry behavior (expect forced logout at 15m).
2. Tasks: create/edit/delete; drag across columns + refresh; checklist add/toggle/delete; label create/assign/remove + filter; description clear; assignee/project/due changes; second user in another tenant cannot see/modify (use two tenants).
3. Cross-tenant probing: authenticated user A requests object IDs of tenant B on every module (expect 404).
4. Client portal: CLIENT role sees only client-visible projects/tasks/invoices.
5. CRM CRUD each entity; finance summary math vs seeded data; invoices status transitions; payments recording.
6. Approvals decide flow; chat channel+message flow; notifications read/unread.
7. Files: confirm metadata-only behavior is understood (no upload).
8. Frontend: direct URL access unauthenticated, new tab, refresh on every page.

---

## 15. Production readiness

| Level | Verdict |
|---|---|
| Local development (compose dev + npm dev) | **Ready** [VERIFIED-RUNTIME via rebuilt stack + owner testing, 2026-07-15] |
| Local MVP demo (full compose) | **Ready** — `docker compose build api web` succeeded post-Phase-1/2 (incl. no-cache web build), containers recreated, health endpoint HTTP 200 [VERIFIED-RUNTIME] |
| Staging | **Not ready** |
| Production | **Not ready** |

### Blockers for production (complete list)

1. **Migrations:** no baseline migration; missing `migration_lock.toml`; deploy path for fresh DBs undefined; no automated migrate-on-deploy.
2. **Uncommitted code:** entire application state outside git.
3. **CORS:** hardcoded localhost origin in `main.ts`.
4. **Auth hardening:** refresh flow unused (15-min logouts), localStorage tokens, no rate limiting, `changeme` JWT fallback, no lockout.
5. **SMTP:** code is graceful-no-op without creds; real credentials + `APP_URL` needed for approval emails.
6. **Storage:** no file/voice binary storage at all (S3 vars exist, no implementation).
7. **Deployment:** no target environment, no domain/TLS, `NEXT_PUBLIC_API_URL` baked at build time.
8. **Backups:** one manual SQL dump; no scheduled backups/restore drill.
9. **Monitoring/logging:** none (no structured logs, no error tracking, no uptime checks).
10. **Security:** helmet, throttler, guard the placeholder endpoints or remove them, visibility-scope enforcement.
11. **Tests/CI:** no runnable unit tests, stale baselines, no CI/CD pipeline.
12. **Dependency hygiene:** `@nestjs/config` peer conflict; Redis declared but unused (either use or remove).
13. **Environment config:** `.env.example` missing at root per docs; document required vars (names in handoff doc).

### Recommended priorities

1. Git commit / branch protection (after excluding backup + logs).
2. Baseline migration strategy (squash current schema into an init migration for fresh environments; keep incremental history for the live DB).
3. Fix CORS env-driven; add throttler + helmet.
4. Implement frontend token refresh.
5. Wire `/tasks/reorder` into Kanban (Phase-1 backend already done).
6. Decide file-storage approach (S3/local) before promising uploads.
7. Update/retire stale baselines; configure jest for the 3 spec files; add CI.

---

## 16. Evidence appendix

- Endpoint inventory: extracted programmatically from all `*.controller.ts` on 2026-07-15.
- Static tests executed: `node --test test/*.test.mjs` in both apps (results §14).
- `npm ci` ERESOLVE reproduction: clean copy of `apps/api` in a temp dir.
- Backup analysis: `grep`/`awk` over `backup_before_tasks_phase1_20260711_160819.sql`.
- Git: `git status --porcelain`, `git log --format='%h %ad %s'`.
- Files repeatedly cited: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/permissions/permission.{guard,service}.ts`, `apps/api/src/modules/tasks/tasks.repository.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/*`, `apps/web/src/lib/{fetch,auth}.ts`, `apps/web/src/components/tasks/*`, `apps/web/app/(workspace)/tasks/page.tsx`, `docker-compose*.yml`, `apps/{api,web}/Dockerfile`.

---

## 17. Recommended Handoff File Set

Hand over exactly this set to the incoming developer.

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
