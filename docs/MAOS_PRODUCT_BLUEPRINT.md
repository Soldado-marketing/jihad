# MAOS Product Blueprint

| | |
|---|---|
| **STATUS** | ACTIVE CANONICAL PRODUCT BLUEPRINT |
| **VERSION** | 1.1 |
| **BASELINE** | main `df08135` |
| **DATE** | 2026-10-05 |
| **OWNER** | MAOS owner |
| **CANONICAL PROJECT** | MAOS — Soldado Marketing Platform |
| **CANONICAL REPOSITORY** | `~/Developer/MAOS/claude` (remote `Soldado-marketing/jihad`) |

**AUTHORITY**

- Repository source code = source of truth for **current implementation**.
- This file = source of truth for **target product architecture**.
- The historical Master Doc (claude.ai MAOS Project) = project history and operational checkpoints.
- A future task may **not** silently override this Blueprint (see §30, §31).
- Precedence when instructions conflict: explicit current owner instruction → current Master Doc checkpoint → this Blueprint → repository code → `CLAUDE.md` / `PROJECT_RULES.md` / skills → historical docs in `docs/` and legacy material. Historical specifications in `docs/` (phase documents, sprint plans, `MAOS_MASTER_SPECIFICATION_*`) are background only and never override this file.

**STATUS LABELS USED BELOW**

| Label | Meaning |
|---|---|
| IMPLEMENTED | Exists in code on `df08135` and is wired to an API route or page |
| PARTIAL | Exists, but a material part of the stated behaviour is missing or a placeholder |
| MISSING | No model, module or page exists |
| PLANNED | Target, sequenced in §27, not yet approved for implementation |
| DEFERRED | Target, intentionally postponed |
| DO_NOT_BUILD_YET | Must not be built without a separate explicit owner approval (§28) |

No completion percentages are used anywhere in this document.

---

## 1. Product identity

MAOS is the internal operating system of Soldado Marketing: one platform in which the agency runs its clients, projects, work, files, approvals, finance and — later — content, social planning, reporting, integrations and automation.

- **Product type:** internal, multi-user, multi-tenant (tenant-isolated), role-based agency operations platform with a client portal.
- **Practical goal:** every business concept (a customer, a project, a task, a file, an approval, an invoice, a person) exists once, in one canonical system, and every page reads from it. The agency stops running the same concept in several tools.
- **Who uses it:** the agency owner, internal staff, freelancers/contractors, and the agency's clients through a restricted portal.
- **What it is not:** not a general accounting package, not a social-media publishing tool (yet), not a workflow-builder product.

## 2. Users and roles

The only role architecture is `TenantMembership.role` (`MembershipRole`): `OWNER`, `MANAGER`, `EMPLOYEE`, `CONTRACTOR`, `CLIENT`. Do not introduce a second role architecture without explicit owner approval.

### 2.1 CURRENT permissions (verified in `apps/api/src/modules/permissions/permission.service.ts`)

| Role | Current default grants |
|---|---|
| OWNER | Everything, including resources marked `sensitive` (finance). Fast-pathed after an ACTIVE OWNER membership check. |
| MANAGER | Write: PROJECT, TASK, SUBTASK, LEAD, OPPORTUNITY, MEETING, FOLLOW_UP, INTERNAL_NOTE, FILE, FILE_VERSION, APPROVAL, CHAT_CHANNEL, CHAT_MESSAGE, NOTIFICATION, VOICE_NOTE, VOICE_TO_TASK_DRAFT, INVOICE, PAYMENT, DASHBOARD, DASHBOARD_WIDGET, REPORT, REPORT_RUN. No `sensitive` resources. |
| EMPLOYEE | Write: TASK, SUBTASK, INTERNAL_NOTE, FILE, FILE_VERSION, CHAT_MESSAGE, NOTIFICATION, VOICE_NOTE, VOICE_TO_TASK_DRAFT, DASHBOARD. Read: PROJECT, APPROVAL, CHAT_CHANNEL, REPORT. |
| CONTRACTOR | Write: TASK, SUBTASK, CHAT_MESSAGE, NOTIFICATION, DASHBOARD. Read: PROJECT, FILE, CHAT_CHANNEL. |
| CLIENT | Read-only, only on routes declared `client-portal` scope and not `sensitive`; data filtered to the membership's `clientScopeKey`. |

- Per-membership overrides exist (`MembershipPermission`).
- `sensitive` requirements are OWNER-only for every other role.
- **Not implemented today:** assigned-item scoping. `ResourceScopeService` returns `*_assigned_scope_not_implemented` for MANAGER, EMPLOYEE and CONTRACTOR. A CONTRACTOR is therefore limited by **resource type**, not yet to assigned projects/tasks.
- `visibilityScope` is stored on the membership and carried through permission decisions, but no query filters by it.

### 2.2 TARGET role experience

| Role | Target |
|---|---|
| OWNER | Full tenant administration, all finance, rates and margins. |
| MANAGER | Operational management within granted permissions; no internal rates/margins unless explicitly granted. |
| EMPLOYEE | Daily operational work; no unrestricted access to rates, costs or margins. |
| CONTRACTOR | Assigned work only: the projects, tasks and files they are assigned to. |
| CLIENT | Client-safe portal only, limited to their own customer scope; never internal costs, rates, notes, channels or reports. |

The CONTRACTOR target requires the assigned-scope work in §6 and §39; it is not current behaviour.

## 3. Current foundation (verified on `df08135`)

| Area | Status | Evidence |
|---|---|---|
| Tenancy | IMPLEMENTED | `Tenant`; every tenant-owned model carries `tenantId`; `tenant-context` module. |
| Authentication | IMPLEMENTED | Bootstrap (one-time), register → `PENDING_APPROVAL` → owner approval, login, refresh, logout, JWT + DB-backed `Session`; `Device`, `Invite`, `RegistrationRequest`. |
| Sessions / login history | PARTIAL | Session endpoints `GET /sessions/current` and `POST /sessions/revoke` are placeholders; the `LoginHistory` model has no writer; suspension does not revoke sessions (§37). |
| RBAC / permissions | IMPLEMENTED (role × resource) / PARTIAL (row scope) | `PermissionService`, `PermissionGuard`, `PermissionResource`, `MembershipPermission`; assigned-item scope not implemented (§2.1). |
| Audit | IMPLEMENTED | `AuditEvent`, `audit` module, login/registration audit actions. |
| Projects | IMPLEMENTED (basic) | `Project`, `ProjectMember`; fields: name, description, status (`ACTIVE`/`PAUSED`/`ARCHIVED`), client visibility. |
| Tasks | IMPLEMENTED | `Task`, `Subtask`, `Label`, `TaskLabel`; assignment, status, priority, due date; list + Kanban pages. Task calendar view is a placeholder ("Coming in a future sprint"). |
| CRM | IMPLEMENTED (foundation) | `Lead`, `Opportunity`, `Meeting`, `FollowUp`, `ProposalDraft`, `InternalNote`; pipeline enum `LEAD → CONTACTED → MEETING → PROPOSAL → NEGOTIATION → WON / LOST`; pages for leads, opportunities, meetings, follow-ups. |
| Files | IMPLEMENTED | `FileAsset`, `FileVersion`, `FileShare`; S3-compatible `StorageService`; signed URLs; file-type and content checks; client file routes. |
| Approvals | IMPLEMENTED | `ApprovalRequest`, `ApprovalDecision`; pages `/approvals`. |
| Chat | IMPLEMENTED | `ChatChannel`, `ChatMembership`, `ChatMessage`; page `/chat`. |
| Collaboration notes | IMPLEMENTED | `collaboration` module (`collaboration/notes`). |
| Notifications | PARTIAL | Read side only on `main`: list, unread count, mark read, mark all read. **No code on `main` creates notifications.** A writer (`NotificationsService.notify()`, six wired events) exists on the unmerged branch `feat/v2-a1-notifications`, which conflicts with `main`. |
| Voice | PARTIAL | `VoiceNote`, `VoiceTranscript`, `VoiceToTaskDraft`; transcription and AI extraction are placeholders. |
| Realtime | PARTIAL | `realtime` module is a placeholder gateway. |
| Finance | IMPLEMENTED (foundation) | `Invoice`, `InvoiceLine`, `Payment`, `RevenueRecord`, `CostRecord`; integer cents; profitability arithmetic (`finance/profitability.ts`); invoice PDF (pdfkit); invoice email via Resend over HTTPS. |
| Client portal | IMPLEMENTED | `/api/client/projects`, `/tasks`, `/files`, `/invoices`, `/payments`; `ClientScopeService` decides the scope from the DB membership only. |
| Dashboards | PARTIAL | `workspace-summary` and `client-summary`: raw entity counts. `client-summary` is reachable by CLIENT but counts the whole tenant (see §37). |
| Reports | PARTIAL | `ReportDefinition`, `ReportRun`, `DashboardWidget`; "run" only inserts a `RUNNING` row — no report engine. |
| CI | IMPLEMENTED | GitHub Actions: API typecheck/build, blocking unit gate (239 tests), integration tests (101 tests, `integration-api` isolated first), web typecheck/build/contract tests, informational dependency audit. |
| Backup / restore scripts | IMPLEMENTED | `scripts/backup-db.sh`, `scripts/restore-db.sh` hardened in MAOS-T08 (no partial dumps, bounded retry, URL parameter fix, no credentials in argv), 19 regression tests. Operational reliability is **not** solved (§37). |
| Deployment | IMPLEMENTED | Railway project with service `jihad` (API, `apps/api/Dockerfile`) and `maos-web` (web, `apps/web/Dockerfile`); PostgreSQL on Railway; GitHub commit statuses report deploys; watch paths skip unaffected services. |

Stack: API NestJS 11 + Prisma 6 + PostgreSQL; web Next.js 15.5.15 + React 19 + Tailwind 3. 42 API modules under `apps/api/src/modules/` (the "39 modules" figure in `CLAUDE.md` is stale). 8 Prisma migrations.

## 4. Foundational gaps (verified)

| Gap | Evidence on `df08135` |
|---|---|
| No canonical Customer | No `Customer` model. Client identity is the string `clientScopeKey` on `TenantMembership`, `Project`, `Task`, `FileAsset`, `FileShare`, `ApprovalRequest`, `ChatChannel`, `ChatMembership`, `ChatMessage`, `VoiceNote`, `RevenueRecord`, `Invoice`, `Payment`. |
| `clientScopeKey` is an authorization boundary, not a business entity | `ClientScopeService` filters every client-facing query to the membership's key; the key has no name, address, contract or owner. |
| Notification writers missing | Zero `notification.create*` calls in `apps/api/src`. |
| No TimeEntry | No model, module or page. |
| No Rate / labour costing | `CostRecord` holds manual costs only; profitability = revenue − recorded costs, no labour. |
| No TenantSettings | Settings page shows profile and workspace name/slug read-only. |
| No ServiceTemplate | No service catalogue. |
| No ContentItem | No content model or page. |
| Reporting incomplete | Dashboards = raw counts; reports have no engine (§3). |
| No scheduler / integration layer | No scheduler dependency, no `@Cron`, no OAuth; external services are only S3-compatible storage and Resend mail. |
| Calendar | Placeholder component only. |
| Assigned-item scoping | Not implemented (§2.1). |

## 5. Hard architecture invariants

AI agents must not violate these without explicit owner approval.

1. **One canonical domain system per business concept.** Extend it; never fork it.
2. **No duplicate systems** for tasks, projects, files, approvals, invoices, payments, users, memberships, customers, content, social planning or notifications. Names such as `TaskV2`, `NewTask`, `Customer2`, `NewFiles`, a second invoice model, or a second people/account system are forbidden shortcuts.
3. **`clientScopeKey` stays the client authorization boundary** until an explicitly approved migration supersedes it.
4. **Tenant isolation is mandatory** for every tenant-owned record; foreign IDs from request bodies must be tenant-validated.
5. **Money is integer minor units (cents)** unless an explicitly approved migration changes the strategy. Percentages may be derived display values, never stored amounts.
6. **Reuse the canonical systems:** `FileAsset`/`FileVersion`/`FileShare` + `StorageService`; `ApprovalRequest`/`ApprovalDecision`; `Task`/`Subtask`; `User` + `TenantMembership`; `PermissionService`/`PermissionGuard`/`PermissionResource`; `AuditEvent`.
7. **Every migration needs separate owner approval** (§29).
8. **Historical migrations are never edited.**
9. **No parallel module architecture.** One NestJS module per feature in `apps/api/src/modules/<feature>/`; web pages in `apps/web/app/`, components in `apps/web/src/components/<domain>/`.
10. **New files follow the existing internal structure**, beside the files of the feature they belong to.
11. **Team and Freelancer are views/extensions of `User` + `TenantMembership`**, never a second identity system.
12. **Content and Social may create or link canonical Tasks**, never run their own task engine.
13. **New `PermissionResource` values are added deliberately to every role policy**, never left to fall through by accident.

## 6. Security invariants

Guaranteed by code today unless marked otherwise.

1. **Tenant isolation:** queries are scoped by `tenantId` from the verified JWT/membership. Foreign IDs in request bodies are not yet consistently tenant-validated — open safety item (§37).
2. **Least privilege:** role × resource defaults in `PermissionService`; `sensitive` finance resources are OWNER-only.
3. **Server-side authorization:** `JwtAuthGuard` + `PermissionGuard` on protected routes; integration tests prove the guards are wired (`security-gate-authz`).
4. **Client portal separation:** client scope comes only from the DB membership, never from the request; `security-gate-client-isolation` proves one client cannot read another's rows on the `/api/client/*` list and detail routes and can read its own. Exception found on `df08135`: `GET /api/dashboards/client-summary` returns tenant-wide counts to a CLIENT — open safety item (§37).
5. **CLIENT must never receive** internal costs, rates, unrelated customers, unrelated files, internal notes, internal channels or internal reports.
6. **Suspended/non-active users must not keep access.** Today login blocks them, but existing sessions are not revoked on suspension and `validateSession`/refresh do not re-check `User.status` — open safety item (§37).
7. **Contractor scope must stay narrower than employee/manager scope.** Today only by resource type; assigned-item scope is not implemented.
8. **Rates, costs and margins are sensitive.**
9. **No secrets in the repository**; OAuth credentials, tokens, DSNs, API keys and passwords are never returned to the browser, logged, or written into docs.
10. **No credentials in process arguments** where avoidable (backup/restore use `PGPASSWORD`/env, verified by tests).
11. **Safe file access:** signed URLs, server-side type/content checks, no storage keys exposed to clients.
12. **No IDOR regressions:** every new route reading by ID must enforce tenant and, where relevant, client scope.
13. **Auditability:** state-changing sensitive operations write `AuditEvent`.
14. **Production data safety:** no production writes, restores or migrations without explicit owner approval.
15. **Never disable a security control to make a test pass.**
16. **Public repository review before every push** (`Soldado-marketing/jihad` is public).

## 7. Global application shell

**CURRENT:** `apps/web/src/components/shell/` (app shell, sidebar, topbar, user menu); navigation registry `apps/web/src/navigation/navigation.ts` with `allowedRoles` per item; separate client navigation; states `empty`, `loading`, `denied`, `unauthorized`.

**TARGET:**
- Role-aware left navigation; a menu entry is never shown to a role that cannot read its data.
- Target navigation, grouped (v1.1, §43): **Work** — Dashboard, My Work, CRM, Customers, Projects, Tasks, Calendar; **Production** — Content, Media, Approvals, Social; **Business** — Time & Costs, Finance, Freelancers, Team; **Insights** — Reports; **System** — Settings, Integrations, Automation, System Health. Evolve the existing registry in small steps; never show a group or entry to a role that cannot read its data.
- Tenant/workspace context visible in the shell.
- Global search across Customers, Projects, Tasks, Files.
- Notification bell backed by real notification writers (§4).
- Profile / account / settings menu.
- Period/month context where a page is time-based.
- One page-level primary action per page.
- Responsive layout; consistent loading, empty and error states from shared primitives (§24).

## 8. Dashboard

| | |
|---|---|
| PURPOSE | Role-safe operational overview: what needs attention now. |
| CURRENT_STATE | PARTIAL. `GET /api/dashboards/workspace-summary` and `client-summary` return raw counts (projects, tasks, leads, opportunities, meetings, open follow-ups, notes, files). |
| TARGET_STATE | **PARTIALLY_UNDEFINED.** The final information architecture is not approved. It will consume the shared MetricsService (§21) and show period metrics with previous-period deltas, not page-specific counts. |
| CORE_WIDGETS | Not fixed until a dashboard task is approved. Candidates: overdue tasks, pipeline value, open/overdue invoices, upcoming deadlines, utilisation. |
| DATA_SOURCES | Canonical domains via MetricsService only. |
| PERMISSIONS | Widgets filtered by role; no finance/rate widgets for non-OWNER unless granted. |
| DEPENDENCIES | Phase D1 MetricsService; Customer (A2); TimeEntry (B1) for utilisation. |
| DO_NOT_DUPLICATE | No per-widget metric queries that re-implement MetricsService. |

## 9. CRM & Leads

**CURRENT (IMPLEMENTED foundation):** `Lead` (name, company, contact, source, status, owner), `Opportunity` (value in cents, status, owner, expected close), `Meeting`, `FollowUp`, `ProposalDraft`, `InternalNote`; 7-stage `CrmPipelineStatus`; pages for leads, opportunities, meetings and follow-ups.

**TARGET:**
- KPIs: total leads, qualified leads, meetings, proposals, conversion rate; previous-period deltas once MetricsService exists.
- 7-stage pipeline Kanban from canonical CRM data; per stage the lead count and opportunity value total.
- Lead cards: company/customer identity, source, value, owner, next action.
- Table: source, responsible user, last contact, next action, next appointment, services, status; search, filters, export, reminders, overdue highlighting.
- **Conversion:** a WON lead/opportunity converts into the canonical Customer (A2) and, where needed, a canonical Project.
- Notes, files and tasks link to canonical `InternalNote`, `FileAsset` and `Task`.

**Do not** create CRM V2 models; extend the existing ones through approved schema tasks.

## 10. Customers (Kunden)

**CURRENT:** MISSING as a business entity. `clientScopeKey` exists as an authorization scope token (§4).

**TARGET:** one canonical `Customer` entity as the business anchor for Projects, Files, Content, Social, Finance, Reports, Calendar and profitability.
- Data: logo, company name, optional tagline, industry, contact person, phone, email, address, website, booked services, annual contract value (cents), status, responsible internal user, active projects, project count, contract start, next deadline.
- Views: Overview, Projects, Files, Notes. KPIs: active customers, new customers, annual revenue, active projects, average customer value. Filters: industry, service, status.

**Migration path (conceptual only — no schema in this task):**

1. Existing authorization boundary: `clientScopeKey` keeps protecting the portal.
2. Introduce the canonical `Customer` domain (approved schema task).
3. Safe mapping/backfill: each distinct `clientScopeKey` per tenant maps to exactly one Customer; the key is kept on the Customer.
4. Compatibility period: reads accept both; portal isolation tests must stay green throughout.
5. Only later, with an explicit migration approval, may the authorization boundary change.

`clientScopeKey` must never be dropped, renamed or bypassed as a side effect of Customer work.

## 11. Projects

**CURRENT (IMPLEMENTED basic):** `Project` + `ProjectMember`; status; client visibility; tasks, files, voice notes and invoices link to a project.

**TARGET:** the same `Project` model, enriched through an approved schema task.
- Possible fields: `customerId`, `serviceType`, `budgetCents`, `deadline`, `ownerUserId`, `projectNumber`.
- Table: project number, customer, service type, responsible user, progress %, status, deadline, task completion, budget, profitability %.
- Overview: members, tasks, files, approvals, finance and time relationships, activity history from `AuditEvent`.
- Analytics: status KPIs and grouping, service-type distribution, next milestones.
- Progress is derived from tasks, not typed in by hand.

## 12. Tasks (Aufgaben)

**CURRENT (IMPLEMENTED):** one `Task`/`Subtask` system with assignment, status (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED`, `ARCHIVED`), priority, due date, labels, project link, client visibility; list, Kanban and detail pages. Calendar view is a placeholder.

**TARGET:**
- Filters: customer, project, status, priority, due date.
- Table: task, checklist progress, customer, project, assignee, priority, status, due date, overdue state, planned time, actual time, progress.
- Detail: description, estimated time, recorded time, checklist and %, timer/start action.
- Possible fields: `estimatedMinutes`, `contentItemId`.
- Recorded time comes from canonical `TimeEntry` (B1), never from task-local time fields.

No second task engine anywhere (including Content and Social).

## 13. Media (Medien)

**CURRENT (PARTIAL):** `FileAsset`/`FileVersion`/`FileShare`, S3-compatible storage, signed URLs, versions, client-visible files, approvals on files; pages `/files`.

**TARGET (reusing the same stack):**
- KPIs, storage usage, quota.
- Filters: customer, project, file type, approval status.
- Grid, compact and list views.
- Cards with thumbnail/preview, duration, customer, project, date, approval state.
- Detail: type, size, resolution, duration, upload date/user, tags, comments, versions; actions download, share, new version, approve.
- Possible fields: `widthPx`, `heightPx`, `durationSeconds`, `thumbnailKey`.

No second media/storage backend.

## 14. Calendar (Kalender)

**CURRENT:** MISSING (placeholder component).

**TARGET:** Month, Week and List views that **aggregate** scheduled items from canonical domains: task due dates, meetings, project milestones/deadlines once they exist, content deadlines and publication dates (C2), later external calendars (Phase F). Filters: customer, project, event type.

The calendar is a view, not a storage system. A `CalendarEvent` entity is allowed only if a later architecture decision proves aggregation insufficient. Google Calendar sync belongs to Integrations, never coupled directly into the calendar UI.

## 15. Time & Costs (Zeit & Kosten)

**CURRENT:** MISSING for time. `CostRecord` exists for manual costs.

**TARGET (Phase B):**
- `TimeEntry`: member, date, customer, project, task, minutes, billable/non-billable, review/billing status.
- `Rate`: deterministic resolution (for example member → role → tenant default); the applicable rate is **frozen onto each time entry** so later rate changes never silently recalculate history.
- Cost = minutes × frozen rate, integer cents.
- KPIs: recorded hours, employee cost, freelancer cost, external cost, total project cost, utilisation.
- Project profitability preview: revenue, total cost (labour + recorded costs), contribution, margin %.
- Analytics: cost by category, hours by department, timesheet reminders (needs scheduler, D4), weekly capacity.
- Rates and costs are sensitive (§6).

## 16. Finance (Finanzen)

**CURRENT (IMPLEMENTED foundation):** invoices with lines, status (`DRAFT`, `SENT`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `VOID`), payments, revenue posting, costs, profitability arithmetic, PDF, email; client invoice/payment portal routes. Known open item: the invoice model/PDF does not yet meet full German invoice requirements.

**TARGET:**
- KPIs: revenue, total costs, profit, margin, open invoices, active contracts.
- Analysis: revenue vs cost by period, profit by customer and service, open/overdue, contract value vs invoiced vs remaining, cash flow, cost distribution.
- Links to Customer (A2) and Project.
- Labour cost from TimeEntry (B2).
- CLIENT sees only its own client-safe financial data; employees and contractors never receive margins/rates by default.

Not an accounting ledger; no second invoice or payment system.

## 17. Freelancers

**CURRENT:** MISSING as a module. Contractors are `User` + `TenantMembership` with role `CONTRACTOR`.

**TARGET:**
- `MemberProfile` (skills, bio, specialisations) and `ContractorTerms` (rate, contract status, valid-until) as extensions of the existing membership.
- Views: role, expertise, hourly rate (OWNER), projects, tasks, status, payment status; detail with customers, current tasks, recent uploads, payout history, contract status.
- Actions: assign canonical Tasks; record payments/costs through canonical finance.
- Utilisation and availability only after B5.

No separate freelancer login or account system.

## 18. Team

**CURRENT (PARTIAL):** users and memberships, roles, membership status, owner approval of registrations (`/dashboard/admin/users/requests`).

**TARGET:** `MemberProfile` with department, skills, internal rate (field-protected), capacity, responsibilities. Team views: members, utilisation, capacity, monthly hours, departments. Member table: role, department, rate if allowed, customers/projects, open tasks, utilisation, status. Later: absences, onboarding checklist; birthday visibility only if approved.

## 19. Content

**CURRENT:** MISSING.

**TARGET (Phase C2), canonical `ContentItem`:**
- Fields: customer, project/campaign, platform/channel, content type/format, status, due and publish dates, owner/assignee, copy/caption metadata, tags.
- Workflow: Idea → Script → Design → Shooting → Editing → Review → Publication.
- Views: Kanban, List, Calendar, media-related view.
- Reuses Customer, Project, Task, `FileAsset`/`FileVersion`, `ApprovalRequest`/`ApprovalDecision`.

No content-specific files, approvals, users or task engine. Not started before Customer (A2). No publishing.

## 20. Social Media

**CURRENT:** MISSING.

**TARGET first (Phase E):** planning and manual capture through a canonical `SocialPost`: planned post, customer, platform, format, content reference, approval, schedule, manual publication status, manual metric snapshots. Later UI: planned/published posts, pending approvals, reach, interactions, platform/format distribution, top posts, upcoming publications.

Manual metrics must never be presented as live data. Real publishing, OAuth platform connections and analytics sync are separate later work (Phase F) and are **DO_NOT_BUILD_YET**.

## 21. Reports

**CURRENT (PARTIAL):** `ReportDefinition`, `ReportRun`, `DashboardWidget`; no engine.

**TARGET:**
- A shared **MetricsService** first (D1): periods, previous-period comparison, KPI deltas, chart series. Every page and report reads metrics through it; no page-specific calculations.
- Report categories: customer, social, performance, project profitability, team/utilisation, finance summaries.
- Builder: customer, period, platforms where relevant, metric selection.
- Formats: PDF, Excel.
- Scheduled reports only with a real job runner (D4).

PowerPoint export is DO_NOT_BUILD_YET. No fake scheduled reporting.

## 22. Settings (Einstellungen)

**CURRENT (PARTIAL):** read-only profile and workspace display.

**TARGET:** canonical `TenantSettings` and `ServiceTemplate` (no schema in this task).
- Groups: organization (company information, logo), branding, locale/currency/timezone, working hours and week, defaults, users and roles, services catalogue and pricing defaults, project defaults, cost rules (default internal rate, default contractor rate, minimum contribution margin), templates, notification preferences (after `NotificationPreference` is approved), integrations (connection state, connect/disconnect, real connection tests only), security, audit (reuses `AuditEvent`).
- Existing status enums are **not** converted into configurable tables without a separate architecture and migration decision.

## 23. Automation

**CURRENT:** MISSING.

**TARGET (last, Phase G):** first 5–10 hard-coded, explicit, auditable automations on a real scheduler (for example first-contact reminder, approval reminder, publication reminder, payment reminder, onboarding reminder). A rule engine only after proven need. A visual workflow builder is DO_NOT_BUILD_YET; never ship a builder without a reliable execution engine.

## 24. Frontend shared primitives

**CURRENT (reuse these):** `components/ui/page-header.tsx`, `components/ui/action-link.tsx`, `components/states/` (empty, loading, denied, unauthorized), `components/motion/skeleton.tsx` and `modal-overlay.tsx`, `components/tasks/kanban-board.tsx` and `list-view.tsx`, `components/tasks/task-modal.tsx`, status badges (task, invoice, payment, approval, transcription), navigation registry, `lib/fetch.ts` / `lib/api.ts` client, `lib/money.ts`.

**TARGET:** deliberately generalised primitives before many new pages: PageHeader, DataTable (sorting, pagination), FilterBar, search input, StatusBadge, cards, DetailPanel (drawer), ChartKit, empty/loading/error states, permission-aware actions, form fields, modal/drawer patterns, pagination.

Do not build eight incompatible tables. A new frontend dependency needs a task-level rationale.

## 25. Target data model map

No Prisma change is made or authorized by this document.

| Concept | Current model | Classification |
|---|---|---|
| Tenant | `Tenant` | EXISTING |
| User | `User` | EXISTING |
| Membership | `TenantMembership`, `MembershipPermission` | EXISTING |
| Customer | — (`clientScopeKey` strings) | NEW_FUTURE_MODEL |
| Project | `Project`, `ProjectMember` | ENRICH_EXISTING |
| Task | `Task`, `Subtask`, `Label`, `TaskLabel` | ENRICH_EXISTING |
| Files | `FileAsset`, `FileVersion`, `FileShare` | ENRICH_EXISTING |
| Approvals | `ApprovalRequest`, `ApprovalDecision` | EXISTING |
| Invoice / Payment | `Invoice`, `InvoiceLine`, `Payment` | ENRICH_EXISTING (German invoice compliance) |
| Revenue / Cost | `RevenueRecord`, `CostRecord` | EXISTING |
| CRM | `Lead`, `Opportunity`, `Meeting`, `FollowUp`, `ProposalDraft`, `InternalNote` | EXISTING |
| Notification | `Notification` | EXISTING (writers missing) |
| NotificationPreference | — | NEW_FUTURE_MODEL |
| TimeEntry | — | NEW_FUTURE_MODEL |
| Rate | — | NEW_FUTURE_MODEL |
| MemberProfile | — | NEW_FUTURE_MODEL |
| ContractorTerms | — | NEW_FUTURE_MODEL |
| TenantSettings | — | NEW_FUTURE_MODEL |
| ServiceTemplate | — | NEW_FUTURE_MODEL |
| ContentItem | — | NEW_FUTURE_MODEL |
| SocialPost | — | NEW_FUTURE_MODEL |
| Reports | `ReportDefinition`, `ReportRun`, `DashboardWidget` | ENRICH_EXISTING |
| CalendarEvent | — | DEFERRED (only if aggregation proves insufficient) |
| Integration credentials | — | DEFERRED (Phase F) |

Each NEW_FUTURE_MODEL or ENRICH_EXISTING change still needs its own task, owner approval, migration plan, verified backup, tests and review.

## 26. Domain ownership map

| Concept | Canonical owner | Current system | Target | Duplicate allowed? |
|---|---|---|---|---|
| Identity | `User` + `TenantMembership` | Implemented | + MemberProfile, ContractorTerms | NO |
| Roles/permissions | `PermissionService` + `PermissionResource` | Implemented | + assigned-item scope | NO |
| Client authorization | `clientScopeKey` via `ClientScopeService` | Implemented | Kept; mapped to Customer | NO |
| Customer identity | `Customer` | Missing | A2 | NO |
| Projects | `Project` | Implemented | Enriched (A3) | NO |
| Work | `Task` / `Subtask` | Implemented | Enriched | NO |
| Files and media | `FileAsset` stack + `StorageService` | Implemented | Media upgrades (C3) | NO |
| Approvals | `ApprovalRequest` / `ApprovalDecision` | Implemented | Reused by content/media | NO |
| Time | `TimeEntry` | Missing | B1 | NO |
| Rates | `Rate` | Missing | B1 | NO |
| Financial records | `Invoice`, `Payment`, `RevenueRecord`, `CostRecord` | Implemented | + labour cost | NO |
| Content workflow | `ContentItem` | Missing | C2 | NO |
| Social planning | `SocialPost` | Missing | E1 | NO |
| In-app notifications | `Notification` | Read side only | Writers (A1) | NO |
| Report config/execution | `ReportDefinition` / `ReportRun` | Partial | Engine (D3) | NO |
| Metrics | MetricsService | Missing | D1 | NO |
| Tenant defaults | `TenantSettings` | Missing | C1 | NO |
| Service catalogue | `ServiceTemplate` | Missing | C1 | NO |
| History/audit | `AuditEvent` | Implemented | Reused | NO |

No responsibility may live in two canonical models.

## 27. Implementation roadmap (target sequencing, not approval)

None of these phases is approved for implementation by this document. Each item becomes a separate MAOS-Txx task with its own approval.

1. **SAFETY / FOUNDATION** — see §37.
2. **PHASE A — Repair / unblock:** A1 notification writers; A2 canonical Customer groundwork with a `clientScopeKey`-safe mapping/backfill design; A3 Project enrichment; A4 frontend primitives; A5 high-value safe UI wins.
3. **PHASE B — Time / Rates / Profitability:** B1 TimeEntry + Rate; B2 profitability including labour cost; B3 Time & Costs UI; B4 MemberProfile + ContractorTerms; B5 utilisation/capacity groundwork.
4. **PHASE C — Settings / Services / Content / Calendar:** C1 TenantSettings + ServiceTemplate; C2 ContentItem pipeline; C3 Media improvements; C4 calendar aggregation.
5. **PHASE D — Metrics / Dashboard / Reports / Scheduler:** D1 MetricsService; D2 dashboard and visual metrics; D3 report engine and approved export formats; D4 job scheduler for reports and digests.
6. **PHASE E — Social planning:** E1 SocialPost planning; E2 manual publication state and metric snapshots; E3 Social page on canonical metrics.
7. **PHASE F — Integrations:** secure OAuth credential infrastructure first; then lower-risk integrations (Slack, Google Calendar) where justified; Meta, Instagram, Facebook, TikTok, Google Ads, GA4 only with explicit approval.
8. **PHASE G — Automation:** hard-coded first; rule engine only if justified; visual builder last, only if justified.

Never start a later phase because it is easier or more visible.

The v1.1 modules in §43 are sequenced inside these phases (§43.3); they add no phase.

## 28. Do not build yet

Unless a later task explicitly approves it:

- visual workflow builder
- real social publishing (Instagram, Facebook, TikTok, LinkedIn, YouTube)
- direct social analytics sync
- advertising analytics sync (Meta Ads, Google Ads, GA4)
- PowerPoint export
- enum-to-table conversions without a real requirement
- HubSpot integration duplicating MAOS CRM, or without a concrete use case
- Notion integration without a concrete use case
- a duplicate Task, Project, Customer, File, Approval, Invoice, Payment or User system

## 29. Migration rule

Every schema/database migration is a separate owner decision. No task may silently include a migration, and this Blueprint authorizes none.

Forbidden: `prisma db push`, `prisma migrate dev`, editing historical migrations.

Every migration task must include: backup readiness (a verified backup immediately before), restore readiness (a working restore path), reviewed migration SQL, rollback/recovery consideration, post-migration verification, and explicit owner approval. Production uses `prisma migrate deploy` only.

## 30. Future task validation protocol

Before planning or implementing every future MAOS-Txx task, check:

1. Is the task consistent with this Blueprint?
2. Does it duplicate an existing canonical system (§26)?
3. Does it require schema/migration approval (§29)?
4. Does it affect authorization?
5. Does it affect tenant isolation or client scope?
6. Does it expose sensitive finance/rate data?
7. Does it affect Production?
8. Does it affect Railway?
9. Does it require a new external integration?
10. Does it create files outside the MAOS single root (`~/Developer/MAOS/`)?
11. Does it conflict with the current active task, or violate phase order (§27)?
12. Is it the approved exact next task?

If any check finds a conflict, do not implement. Return exactly:

```
BLUEPRINT_CONFLICT: YES

CONFLICT_WITH:
<exact section / rule>

REQUESTED_ACTION:
<what was requested>

SAFE_ALTERNATIVE:
<smallest compliant option>

OWNER_DECISION_REQUIRED:
<exact decision>
```

Then STOP. Do not silently reinterpret the Blueprint.

## 31. Blueprint change control

This Blueprint changes only through an explicit, owner-approved Blueprint task. A coding task never implicitly authorizes changing architecture, domain ownership, phase order, a security invariant, canonical models, permission boundaries or product scope, and no implementation task may rewrite this file to justify its own code.

Every proposed change reports:

```
OLD_RULE:
PROPOSED_RULE:
REASON:
IMPACT:
OWNER_APPROVAL_REQUIRED:
```

Historical decisions are recorded in the changelog (§32), not deleted.

## 32. Versioning

Version 1.0. A material architecture change increments the version (1.x for refinements, 2.0 for a change to invariants or domain ownership). Every change is committed and adds a changelog line with a short rationale.

### Changelog

| Version | Date | Task | Change |
|---|---|---|---|
| 1.0 | 2026-10-05 | MAOS-T09 | Initial canonical blueprint, reconciled against `df08135`. |
| 1.1 | 2026-10-10 | MAOS-T11 | Approved product structure added (§43): My Work, Customer 360, client lifecycle, service catalog and packages, request center, templates and recurring work, delivery tools, quality control, knowledge base, import/export, archive, system health, release control, grouped navigation. Extension only — no invariant, ownership or phase change. Rationale: owner-approved Master Autonomous Build & Completion Protocol v1.0 (2026-10-09). |
| 1.0 | 2026-10-09 | MAOS-T09 | Pre-merge factual refresh of §3 and the dated snapshot §35–§41 from the 2026-10-09 audit (backup recovery, session/login-history placeholders, dependency advisories, revenue integrity, unmerged notification branch). No rule, invariant or ownership change, so the version stays 1.0. |

## 33. Repository reconciliation (on `df08135`)

| Area | Current implementation | Target | Gap | Action later |
|---|---|---|---|---|
| Customer | `clientScopeKey` strings only | Canonical Customer | Entity missing | A2 |
| Notifications | Read endpoints only | Writers + preferences | No writers | A1 |
| Contractor scope | Resource-type limits only | Assigned items only | `ResourceScopeService` placeholder | Safety (§37) |
| `visibilityScope` | Stored, not enforced | Values that are enforced | Misleading values | Safety (§37) |
| Suspended users | Login blocked only | Sessions revoked, status re-checked | Existing sessions survive | Safety (§37) |
| Foreign IDs | Not consistently validated | Tenant-validated + tests | Possible cross-tenant links | Safety (§37) |
| Task calendar | Placeholder | Calendar aggregation | Not built | C4 |
| Dashboard | Raw counts | MetricsService-based | No metrics engine | D1, D2 |
| Client dashboard summary | CLIENT receives tenant-wide counts | Client-scoped counts | Aggregate cross-client disclosure | Safety (§37) |
| Reports | Run inserts a row | Real engine + exports | No engine | D3 |
| Settings | Read-only page | TenantSettings | No model | C1 |
| Time & rates | None | TimeEntry + Rate | Missing | B1 |
| Voice AI | Placeholders | Real transcription | Not wired | Not sequenced; needs a task |
| Invoices | Working foundation | German invoice compliance | Incomplete fields/PDF | Safety (§37) |
| Instruction files | `CLAUDE.md` says 39 modules; `PROJECT_RULES.md` names an old Codex path | Current facts | Stale text | Hygiene (§37) |

## 34. Instruction file references

`CLAUDE.md`, `PROJECT_RULES.md` and `.claude/skills/maos-production-engineer/SKILL.md` each carry a short mandatory rule pointing here:

- read `docs/MAOS_PRODUCT_BLUEPRINT.md` before planning or executing any MAOS task;
- validate the task against it (§30) and return `BLUEPRINT_CONFLICT` on conflict;
- never modify the Blueprint inside an unrelated implementation task;
- keep the one-task-at-a-time protocol.

They do not duplicate this document.

## 35. Current project status snapshot (2026-10-09)

- **Canonical repo:** `~/Developer/MAOS/claude`
- **Current main:** `df08135` (unchanged since MAOS-T08)
- **Task registry:** MAOS-T01, T02, T03, T05, T06, T07, T08 verified complete from git or on-disk evidence; MAOS-T04 has no verifiable record; MAOS-T09 (this Blueprint) is complete but not merged. The live task registry is `docs/MAOS_EXECUTION_LEDGER.md` once merged.
- **MAOS-T08:** PR #3 merged into `df08135`; CI PASS (run 37311267837); blocking gate 239/239; integration 101/101; NEW_REGRESSIONS 0; Railway API `jihad` deploy SUCCESS; `/api/health` 200; `/api/health/ready` 200; web not redeployed (no watched paths changed).
- **Baseline on `df08135` (2026-10-09):** API full 342 tests / 299 pass / 43 known stale-spec failures; gate 239/239; integration 101/101; web 64 tests / 61 pass / 3 known failures; API and web typecheck and build PASS.
- **Unmerged work:** `feat/v2-a1-notifications` (notification writers, 2026-09-06, conflicts with `main` in four invoice/payment files); `docs/consolidate` (env/deploy docs; also carries an SH Investments README and must not be merged as is).
- **Production data:** REAL_CLIENT_DATA_ALLOWED = no (owner decision).
- Backup infrastructure risks are **not** solved (§37).

## 36. Current active checkpoint

| | |
|---|---|
| ACTIVE_TASK | MAOS-T09 (complete, awaiting owner review and merge) |
| BASE | `df08135` |
| BRANCH | `docs/product-blueprint-v1` |
| GOAL | Establish the permanent Product Blueprint and architecture guardrails. |

Creating this Blueprint approves no implementation phase. Execution state lives in the execution ledger, not here.

## 37. Safety work remaining (separate from product V2)

Verified on 2026-10-09.

| Item | Status | Evidence / why | Next action |
|---|---|---|---|
| Nightly production backup | FRAGILE | 2026-10-04 and 2026-10-06 failed ("could not obtain the database URL from Railway (login expired?)"); 2026-10-05 failed after 3 retries ("SSL error: unexpected eof"); 2026-10-07, 08, 09 succeeded. The wrapper depends on an interactive Railway CLI login. | Version-control the wrapper; non-interactive credential source. |
| Backup depends on the Mac | OPEN | LaunchAgent at 03:30 runs a script under `~/MAOS_BACKUPS` (reached through `~/Developer/MAOS/backups`, outside Git); runs stretch to 4.5 hours while the Mac sleeps. | Wake schedule (owner applies) and run guard. |
| No backup failure alerting | OPEN | Failures are written only to a local log. | Failure and staleness alert. |
| No off-Mac backup copy | OPEN | Dumps exist only under `~/MAOS_BACKUPS` on the Mac. | Owner decision on storage target. |
| No automated restore rehearsal | OPEN | Rehearsals are manual. | Scripted, scheduled rehearsal in a disposable container. |
| Public PostgreSQL endpoint | OPEN (owner decision) | The backup reads Railway's `DATABASE_PUBLIC_URL`. | Infrastructure decision. |
| Client summary count leak | OPEN | `GET /api/dashboards/client-summary` is allowed for CLIENT but counts projects, tasks and invoices across the whole tenant. Counts only, no records. The stale test "keeps client dashboard summaries client-safe" fails for this reason. | Client-scoped counts + isolation test. |
| Suspended users keep access | OPEN | Suspension does not revoke sessions; `validateSession` and refresh do not re-check `User.status`. Membership status is enforced inside `PermissionService`. | Revoke + re-check. |
| Session endpoints | OPEN | `GET /api/sessions/current` and `POST /api/sessions/revoke` return placeholders. | Real own-session endpoints. |
| LoginHistory | OPEN | No code writes `LoginHistory`. | Writers on login success/failure. |
| Foreign-ID tenant validation | OPEN | Body foreign IDs are written unchecked (for example `projectId` and `assignedToUserId` in `tasks.repository.ts`). | Per-domain validation with cross-tenant HTTP tests. |
| `visibilityScope` | OPEN | Stored and displayed, never filtered on. | Restrict to enforced values first. |
| Contractor assigned-item scope | OPEN | `ResourceScopeService` placeholder. | Dedicated task (changes what contractors see). |
| Invoice default-recipient filtering | DEFERRED | Default recipients are all CLIENT members of the invoice project, not filtered by the invoice's `clientScopeKey` or membership status. Owner deferred. | Separate approval. |
| Dependency advisories | OPEN | `npm audit --omit=dev`: API 1 critical (`proxy-addr`) + 5 high (incl. `@nestjs/platform-express`/multer 2.2.0, `prisma`); web 1 critical (`next` 15.5.15) + 4 high. All fixable without a major upgrade (Next 15.5.27). | Patch web and API separately. |
| Trust proxy / throttling | OPEN | No `trust proxy`; the global throttler keys on the Railway proxy address. | Set trust proxy + test. |
| Web security headers | OPEN | No headers configured in `next.config` or middleware. | Add headers. |
| Revenue posting integrity | PARTIAL | "Revenue once per invoice" is a check-then-insert in code (`invoices.repository.ts`); no database constraint. | Partial unique index (migration). |
| German invoice compliance | OPEN | No VAT, tax-identity or service-date fields. | Owner regime decision, then schema + PDF. |
| Security/ops hygiene | OPEN | Placeholder endpoints (sessions, AI, transcription, realtime), stale sprint-spec tests, stale SMTP references, stale instruction-file text. | Hygiene tasks. |
| Repository visibility | Public (fact) | GitHub reports `Soldado-marketing/jihad` as public. | Owner decision. |
| Compatibility symlink | OPEN | `~/Developer/claude` → `~/Developer/MAOS/claude` still present. | Reconcile later; not inside an unrelated task. |

## 38. Product module status

| Module | Current status | Target status | Major gap | Dependencies |
|---|---|---|---|---|
| Dashboard | PARTIAL | PLANNED (D2) | Raw counts, IA undefined | MetricsService (D1) |
| CRM | IMPLEMENTED (foundation) | PLANNED enrichment | KPIs, deltas, conversion to Customer | Customer (A2), D1 |
| Customers | MISSING | PLANNED (A2) | No entity | Safety gate, approved migration |
| Projects | IMPLEMENTED (basic) | PLANNED (A3) | Customer, budget, deadline, owner, number | A2 |
| Tasks | IMPLEMENTED | PLANNED enrichment | Estimates, time, calendar view | B1, C4 |
| Media | PARTIAL | PLANNED (C3) | Metadata, thumbnails, quota | A2 |
| Calendar | MISSING | PLANNED (C4) | Placeholder only | Tasks, Meetings, C2 |
| Time & Costs | MISSING | PLANNED (B1–B3) | No TimeEntry/Rate | Safety gate, migration |
| Finance | IMPLEMENTED (foundation) | PLANNED enrichment | German compliance, labour cost, customer link | A2, B2 |
| Freelancers | MISSING | PLANNED (B4) | No profile/terms; no assigned scope | Assigned-scope work |
| Team | PARTIAL | PLANNED (B4, B5) | No profiles, capacity | B1 |
| Content | MISSING | PLANNED (C2) | No ContentItem | A2, C1 |
| Social | MISSING | PLANNED (E) | No SocialPost | C2, D1 |
| Reports | PARTIAL | PLANNED (D3) | No engine | D1, D4 |
| Notifications | PARTIAL | PLANNED (A1) | Writers exist only on an unmerged, conflicting branch | — |
| Settings | PARTIAL | PLANNED (C1) | No TenantSettings | — |
| Integrations | MISSING (beyond S3 and Resend) | PLANNED (F) | No OAuth layer | D4 |
| Automation | MISSING | PLANNED (G) | No scheduler | D4 |

## 39. Roadmap remaining after T09

**Operational / safety remaining:** everything OPEN, FRAGILE, PARTIAL or DEFERRED in §37.

**Product roadmap remaining:** Phase A → B → C → D → E → F → G (§27). None started; the notification writers (A1) exist only on an unmerged branch.

**Deferred / do-not-build-yet:** everything in §28; CalendarEvent entity; integration credentials until Phase F.

The granular, ordered task registry is maintained in `docs/MAOS_EXECUTION_LEDGER.md`, not in this file.

## 40. Exact next task candidate

This Blueprint approves nothing. The next task is the first dependency-ready task in the execution ledger's registry. On the 2026-10-09 evidence that is backup recoverability (Floor 1): the scheduled backup failed three of six nights, has no alert and no off-Mac copy, and every migration (§29) needs a verified backup immediately beforehand.

## 41. MAOS_OWNER_SNAPSHOT

**WHERE_WE_ARE_NOW:** MAOS runs in production on Railway from `df08135`. The core platform (tenancy, auth, permissions, projects, tasks, CRM, files, approvals, chat, finance, client portal) exists and CI is green. Real client data is not allowed yet. Nightly backups recovered on 2026-10-07 after three failures but remain fragile.

**WHAT_IS_FINISHED:** MAOS-T01–T03, T05–T08; backup/restore script hardening; integration-test race fix; invoice recipient privacy; Resend mail.

**WHAT_IS_ACTIVE:** MAOS-T09, this Blueprint, awaiting review.

**WHAT_IS_BLOCKING_US:** fragile, unalerted, Mac-only backups; open safety items (§37), especially suspended-user sessions, foreign-ID validation, contractor scope, the client-summary count leak and critical dependency advisories.

**WHAT_COMES_NEXT:** backup recoverability (§40).

**WHAT_REMAINS_AFTER_THAT:** the rest of the safety work, then Phases A to G in order.

**READY_FOR_V2:** NO

**READY_FOR_LARGE_USER_ROLLOUT:** NO

**REASON:** backups are fragile, real client data is not yet allowed, several authorization gaps are open and critical dependency advisories are unpatched.

## 42. Master Doc relationship

- The historical Master Doc in the claude.ai MAOS Project remains the historical and operational context (task registry, checkpoints, owner decisions) for now.
- This Blueprint is the canonical target product and architecture reference.
- The repository remains the source of truth for current code.
- This Blueprint does not copy or replace the Master Doc. §35–§41 are a dated snapshot, not an operational log; when they disagree with a newer Master Doc checkpoint, the Master Doc wins for operational state.
- A later, separately approved task may migrate or unify the operational Master Doc into an accessible canonical location. There must never be two competing operational Master Docs.

## 43. Approved product structure (v1.1)

Added 2026-10-10 by MAOS-T11 from the owner-approved Master Autonomous Build & Completion Protocol v1.0. Every item is **TARGET / PLANNED**: none exists yet unless §3 says so, and none is approved for implementation by this section. Each one reuses the canonical systems in §5 and §26; none may introduce a second task, project, customer, file, approval, invoice, payment or user system.

### 43.1 Change control (§31)

| OLD_RULE | PROPOSED_RULE | REASON | IMPACT | OWNER_APPROVAL_REQUIRED |
|---|---|---|---|---|
| §7 lists 16 navigation entries | §7 groups navigation into Work / Production / Business / Insights / System and adds My Work, Integrations, System Health | Approved product structure | Navigation evolves in small steps (registry task) | Granted (protocol v1.0); each UI task still reviewed |
| No My Work, Customer 360, Client Health, client lifecycle, packages, request center, templates, recurring work, QC, knowledge base, import/export, archive, system health or release control | These are TARGET modules as defined in §43.2 | Approved product structure | New registry tasks; no existing rule changes | Granted for planning; each implementation task needs its own approval and any schema its migration gate |
| §27 phases list only the v1.0 modules | §43.3 places each new module inside the existing phases | Keep one roadmap | No phase added or reordered | Granted |

### 43.2 Modules

| Module | Purpose | Reuses (canonical) | New model needed |
|---|---|---|---|
| My Work | One per-user inbox: assigned, overdue and upcoming tasks, approvals waiting, requests needing action, notifications, meetings, blocked work, content awaiting action | Task, ApprovalRequest, Notification, Meeting, ContentItem | No — aggregation only |
| Global search + quick actions | Permission-aware search over customers, projects, tasks, files; command palette | existing domains | No |
| Unified activity timeline | Per-resource history | AuditEvent | No |
| Customer 360 | One workspace per customer: profile, contacts, CRM history, projects, tasks, content, media, approvals, requests, contracts, packages, invoices, payments, profitability, meetings, timeline | Customer (§10) + all linked domains | No beyond Customer |
| Client health | Explainable score; every input shown (overdue work, blocked approvals, open requests, renewals, unpaid invoices, delivery completion, workload) | MetricsService (§21) | No |
| Client onboarding / offboarding | Checklists per customer | Templates, Task | No (uses templates) |
| Contracts / renewals | Contract terms and renewal dates | Customer, Finance | Yes (approved schema task) |
| Service catalog | Reusable agency services and defaults (Social Media, Video/Photo, Web, Meta/TikTok/Google Ads, administration) | ServiceTemplate (§22) | ServiceTemplate |
| Retainers / monthly packages | Recurring deliverable expectations per customer and month, tracked against canonical content and tasks (e.g. "Reels 2/3, Posts 3/3, waiting approval 1") | ContentItem, Task, Project | Yes (package definition only) |
| Client request center | Portal request → triage → accept/reject → canonical Task or Project work → status visible to the client | Task, Project, client portal | Yes (request record; never a second task system) |
| Templates + recurring work | Project, task, content and service templates; explicit recurring generation first, automatic later (§23) | Project, Task, ContentItem | Yes (template/recurrence definitions) |
| Task dependencies / blockers, saved views, bulk actions | Delivery tools on the canonical Task system | Task | Dependencies: yes; saved views: only if stored |
| Meeting notes → decisions → tasks | Turn meeting outcomes into tasks | Meeting, InternalNote, Task | No |
| Quality control | Reusable delivery checklists (format, language, brand, audio, spelling, caption, platform rules, client approval) | Subtask, ApprovalRequest | Possibly checklist templates |
| Approval queue | One view of pending approvals | ApprovalRequest | No |
| Monthly deliverables tracker | Package progress per customer and month | Packages, ContentItem, Task | No beyond packages |
| Brand guidelines + knowledge base | SOPs, internal processes, client brand guidelines, onboarding docs — not a Notion clone | FileAsset where files are attached | Yes (simple document records) |
| Freelancer operating flow | Assigned → delivered → approved → cost → freelancer invoice uploaded → matched → due → paid | User + Membership, MemberProfile, ContractorTerms, FileAsset, Finance | Freelancer invoice/match records |
| Resource planning, capacity forecast, profitability cockpit | Availability, load, utilisation, forecast; estimated vs actual hours, labour/freelancer/external cost, margin by project/customer/service | TimeEntry, Rate, MetricsService | Capacity fields; no precise utilisation before TimeEntry/Rate data exists |
| Import / export | CSV first for customers, projects, tasks, time entries, safe finance data; no ETL platform | existing domains | No |
| Data archive / retention | Archive and retention rules | existing domains | Possibly retention markers |
| System health | Owner-only view: API/web health, deployment, backup freshness, restore rehearsal status, failed jobs, integration and scheduler health; never secrets | health endpoints, backup/rehearsal reports, scheduler | No |
| Release control | Restored-dump rehearsal for risky changes; minimal server-side feature flags; staging decision (ADR-016, decision D10) | — | No (staging is an owner/Railway gate) |

### 43.3 Placement in the phases (§27)

- **Phase A:** My Work, global search + quick actions, activity timeline, Customer 360 foundation, grouped navigation (smallest safe evolution).
- **Phase B:** freelancer operating flow, resource planning, capacity forecast, profitability cockpit (after TimeEntry/Rate).
- **Phase C:** service catalog, retainers/packages, templates, recurring work (explicit), request center, quality control, approval queue, meeting notes → tasks, task dependencies, saved views/bulk actions, client onboarding/offboarding, contracts/renewals, knowledge base and brand guidelines, monthly deliverables tracker, import/export, archive.
- **Phase D:** client health, system health UI, delivery and financial performance reports.
- **Phase G:** automatic recurring work, renewal reminders and digests (after the scheduler).

Owner question D12 (whether Calendar, Templates, Recurring work and Requests come before People & Money) stays open; until it is answered the order above follows §27.

### 43.4 Do not build yet (additions to §28)

Generic rule-engine UI; speculative AI features without a real workflow.

