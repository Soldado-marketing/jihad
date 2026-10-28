# MAOS UI/UX Product Audit — 2026-10-23

| | |
|---|---|
| Type | Audit only. No code, schema, API, permission or production change. |
| Baseline | `main` `ccfb32c` (`apps/web`) |
| Method | Static review of routes, components, navigation and data flows in the repository. **No runtime/visual review was done** (it needs a disposable database and seeded roles); findings marked *(code)* are proven in source, layout impressions are not claimed. |
| Authority | `docs/MAOS_PRODUCT_BLUEPRINT.md` stays canonical. Every proposal that would change Blueprint behaviour is listed as an owner decision (§8), never applied silently. |
| Status | Awaiting owner review. T69 (navigation regrouping) is **not** started. |

---

## 1. Inventory of existing screens

56 pages: 42 workspace, 9 client portal, 4 auth, 1 root redirect.

| Area | Routes | What it does today |
|---|---|---|
| Dashboard | `/dashboard` | Operations-first (D7): needs attention, my next tasks, next 7 days, approvals waiting, recent activity, active projects, workspace counts, OWNER finance KPIs, admin links. |
| My Work | `/my-work` | Per-user inbox: assigned/overdue/upcoming tasks, approvals, notifications, meetings (KPI cards). |
| Calendar | `/calendar` | Month/week/list aggregation of task due dates and meetings. |
| CRM | `/crm`, `/crm/leads`, `/crm/leads/[id]`, `/crm/opportunities`, `/crm/opportunities/[id]`, `/crm/meetings`, `/crm/follow-ups` | Overview, 7-stage pipeline board, lists and details, meeting decisions → tasks. |
| Customers | `/customers`, `/customers/[id]` | List with filters (DataTable/FilterBar); Customer 360 tabs (Overview, Projects, Files, Notes) with OWNER-only money. |
| Projects | `/projects`, `/projects/[id]` | Enriched list (number, customer, service, owner, progress, status, deadline, OWNER budget); detail with edit form, members, OWNER profitability preview. |
| Tasks | `/tasks`, `/tasks/[id]` | Kanban / list / calendar views, create form, task modal (subtasks, labels, files), filters. |
| Time & Costs | `/time` | Timesheet: log/edit/submit, approve/reject (OWNER/MANAGER), OWNER cost and unrated minutes. |
| Files | `/files`, `/files/[id]` | Upload, versions, visibility, signed download. |
| Approvals | `/approvals`, `/approvals/[id]` | Queue with detail panel, decisions on open requests. |
| Finance (OWNER) | `/finance`, `/finance/invoices(/[id])`, `/finance/payments`, `/finance/revenue`, `/finance/costs` | Overview with labour-aware totals, invoices + PDF/mail, payments, revenue and cost records. |
| Reports | `/reports`, `/reports/[id]` | Definitions and run rows only (no engine). |
| Team / collaboration | `/chat`, `/collaboration`, `/notifications` | Channels, internal notes, notification list. |
| Voice | `/voice(/[id])`, `/voice/task-drafts(/[id])` | Voice notes and task drafts; transcription/AI are placeholders. |
| Admin (OWNER) | `/dashboard/admin/users/requests`, `/dashboard/admin/invites`, `/audit` | Registration approval, invites, audit log. |
| Data | `/data` | CSV import/export (customers, projects, tasks). |
| Settings | `/settings` | Profile, workspace display, membership settings. |
| Client portal | `/client`, `/client/projects(/[id])`, `/client/tasks(/[id])`, `/client/files`, `/client/invoices(/[id])`, `/client/payments` | Separate shell (`client-shell`, `client-sidebar`, `client-topbar`), client-safe data only. |
| Auth | `/auth/login`, `/auth/register`, `/auth/invite`, `/unauthorized` | Login, registration (pending approval), invite acceptance. |

Shell: `components/shell/` — left sidebar (grouped), topbar with command palette (global search) and notification bell, user menu. Navigation registry: `src/navigation/navigation.ts` (role-filtered items).

---

## 2. UX / navigation inconsistencies and usability problems

Each item cites the code. Severity: **H** high (confuses users or hides data), **M** medium, **L** low.

### Navigation

| # | Finding | Evidence | Sev |
|---|---|---|---|
| N1 | The grouping users see lives in `sidebar.tsx` (`navGroups`: Workspace / Delivery / Team / Operations), separate from the registry, whose comments use other groupings (Core, Admin, Delivery, Sales, Data, Account, Team, Operations). Two sources of truth for one menu. | `src/components/shell/sidebar.tsx` `navGroups`; `src/navigation/navigation.ts` | M |
| N2 | Current groups differ from the Blueprint target (Work / Production / Business / Insights / System, §7/§43). Finance, Reports, Settings, Audit and Import sit together under "Operations"; admin items (User Requests, Invitations) sit under "Workspace" next to Dashboard. | `navGroups` | M |
| N3 | Menu entries use two-letter text glyphs instead of icons; `time` and `data` have no glyph and fall back to the first two letters ("TI", "IM"). | `navGlyphs`, `sidebar.tsx:147` | L |
| N4 | Labels differ between menu, page header and Blueprint: menu "Customers" vs page eyebrow "Clients"; menu "CRM" vs Blueprint "CRM & Leads"; page title "Task Board". | `customers/page.tsx:143`, `tasks/page.tsx:315`, `navigation.ts` | L |
| N5 | A deferred `client-placeholder` item (`href: '#client-portal-deferred'`) still lives in the registry; it is filtered out, but it is dead configuration. | `navigation.ts` | L |

### Consistency of screens

| # | Finding | Evidence | Sev |
|---|---|---|---|
| C1 | Only 4 list pages use the shared `DataTable` + `FilterBar` (customers, projects, leads, time). 10 pages build their own `<table>` (opportunities, invoices, invoice detail, payments, revenue, costs, audit, invites, user requests, data). Sorting, paging and empty states therefore behave differently per page. | grep `<table` in `app/` | H |
| C2 | Tasks — the most used work screen — does not use `FilterBar`: its five filters are local state, are lost on reload, cannot be shared as a link, and differ from Projects (URL-held filters). | `tasks/page.tsx:208-268` | H |
| C3 | Tasks loads every task, project, member, file and label of the workspace in one go and filters in the browser; no paging. Fine at today's data size, slow as the workspace grows. | `tasks/page.tsx:217-221` | M |
| C4 | The Dashboard re-implements its own `StatCard`, `Panel`, `SectionTitle` and loading/error placeholder instead of `KpiCard`, `PageHeader` and the shared states; KPI styles therefore differ between Dashboard, My Work and Customer 360. | `dashboard/page.tsx:47-81` | M |
| C5 | Two badge systems: `ui/status-badge` (T61, used by task and pipeline badges) and separate invoice and approval badge implementations with their own colours. | `finance/invoice-status-badge.tsx`, `approvals/approval-status-badge.tsx` | M |
| C6 | 12 pages ask for confirmation with the browser's `confirm()`/`alert()` dialog (unstyled, not translatable, blocks the page) while other actions use the styled `ModalOverlay`. | grep `confirm(` in `app/` | M |
| C7 | Loading is shown three ways: shared `LoadingState`/`Skeleton` (rare: 2–3 files), the dashboard's pulse box, and a plain "Loading…" text (≈50 places). | grep | L |
| C8 | Colours: the theme tokens (`ink`, `muted`, `line`, `accent`, …) are used widely, but about 510 raw Tailwind palette classes (`slate-500`, `gray-…`, `blue-…`) are mixed in, so greys and blues drift between screens. No dark mode. | `tailwind.config.ts`; grep | L |
| C9 | 36 components under `src/components/` are not imported by any page (sprint-skeleton leftovers such as `dashboard/module-readiness-board`, `workspace-command-center`, `projects/project-list`, `crm/lead-list`, `finance/invoice-list`, `ui/action-link`). Several are still read by source-text tests. They make it unclear which component is the real one. | import scan | M |
| C10 | `task-modal.tsx` is 1 111 lines (detail, edit, subtasks, labels, files in one component) — hard to change safely and to keep consistent with the project and customer detail screens. | `components/tasks/task-modal.tsx` | M |
| C11 | Detail screens use three patterns: full page (projects, customers, invoices), modal (tasks), side panel (`DetailPanel`: approvals, meetings only). | grep `DetailPanel` | M |

### Language and accessibility

| # | Finding | Evidence | Sev |
|---|---|---|---|
| L1 | The whole UI is English (`<html lang="en">`, no translated strings), while the Blueprint names modules in German too (Kunden, Aufgaben, …) and `src/i18n/direction.ts` prepares `ar`/`en`/`de` with RTL. The language of the product is undecided. | `app/layout.tsx:23`, `src/i18n/` | M (decision) |
| L2 | Two-letter glyphs are hidden from screen readers (`aria-hidden`) and the labels carry the meaning — good; but icon-less navigation is harder to scan. Baselines exist in `docs/ux/accessibility-baseline.md` and `rtl-ltr-baseline.md`; this audit did not run a WCAG check (needs runtime). | `sidebar.tsx` | L |

### What already works well (keep)

Role-aware menu and server-side permissions; client portal fully separated; finance and rate data hidden from non-OWNER in the API, not just the UI; dashboard sections say "could not load" instead of showing fake zeros; command palette and notification bell; Customer 360 tabs shown only for sections the API returned; URL-held filters on Projects/Customers/Time.

---

## 3. Reusable components and patterns that already exist

| Pattern | Component(s) | Used by |
|---|---|---|
| Page header | `ui/page-header.tsx` | almost every page |
| Table with sort + paging | `ui/data-table.tsx` (T59) | customers, projects, leads, time |
| Filters + search in the URL | `ui/filter-bar.tsx` (T60), `lib/projects.ts` accessor pattern | same 4 pages |
| KPI card | `ui/kpi-card.tsx` (T61, supports deltas) | my-work, customer 360 |
| Status badge | `ui/status-badge.tsx` (T61) | task, pipeline badges |
| Side panel / drawer | `ui/detail-panel.tsx` (T61) | approvals, meetings |
| Activity timeline | `ui/activity-timeline.tsx` (T66) | customer 360 (not yet on the project page) |
| States | `states/empty`, `loading`, `error`, `denied`, `unauthorized` | empty state widely; others rarely |
| Motion | `motion/` (page transition, skeleton, modal overlay, toast, stagger) | shell, some pages |
| Kanban / list | `tasks/kanban-board.tsx`, `tasks/list-view.tsx` | tasks; CRM pipeline board reuses the Kanban idea |
| Calendar | `calendar/agency-calendar.tsx` | calendar page, tasks calendar view |
| Shell | `shell/` (sidebar, topbar, command palette, user menu) | workspace |
| Data access | `lib/fetch.ts` `apiFetch`, `lib/money.ts` | all pages |

Conclusion: the design system already exists in small form (T59–T61). The main problem is **adoption**, not missing components. Nothing here needs a rebuild from scratch.

---

## 4. Gap analysis

| Area | Verdict | Reason |
|---|---|---|
| Shell, command palette, notification bell, client portal shell | KEEP | Work, role-safe. |
| Navigation registry + sidebar grouping | IMPROVE | One source of truth, target groups, icons (needs T69 owner decision). |
| Dashboard | IMPROVE | Content is right (D7); move to shared `KpiCard`/`PageHeader`/states. Period deltas wait for MetricsService (T120) — not invented now. |
| My Work, Calendar, Customer 360, Approvals | KEEP | Recent, use the primitives. Minor polish only. |
| Projects list | KEEP | Reference implementation of DataTable + FilterBar. |
| Project detail | IMPROVE | Replace `confirm()`; align tabs with Customer 360 (overview, tasks, files, time, activity). |
| Tasks page | IMPROVE (high priority) | FilterBar with URL filters, shared table for the list view, split the 1 111-line modal, paging later. Kanban/list/calendar views stay. |
| Finance lists, audit, invites, user requests, data | IMPROVE | Move hand-built tables to `DataTable`. Behaviour and permissions unchanged. |
| Status badges | IMPROVE | One `StatusBadge` colour scale for every domain. |
| Confirm dialogs | IMPROVE | One styled confirm dialog on `ModalOverlay`. |
| Unused skeleton components | IMPROVE (cleanup) | Remove only after the source-text tests that read them are updated; separate small task. |
| Reports | DEFER | Needs the report engine (T120/T123); a redesign now would show nothing real. |
| Content, Media grid, Social, Freelancers, Team, Integrations, System Health, Automation | DEFER | No data model yet (migration-gated or later waves). No mock screens with invented data. |
| Voice | DEFER | Transcription/AI are placeholders; keep as is. |
| Language (de/en) and dark mode | DEFER until decided | Owner decision (§8). |
| Complete redesign / new UI library | Not recommended | The existing Tailwind + primitives approach is sufficient; a new dependency needs a task rationale (Blueprint §24). |

---

## 5. Proposed navigation and design-system direction

### 5.1 Navigation (proposal for T69 — owner decision, not applied)

Blueprint §7/§43 target, mapped only to screens that exist today. Groups and entries are shown only when the role can read the data (unchanged rule).

```
WORK         Dashboard · My Work · CRM & Leads · Customers · Projects · Tasks · Calendar
PRODUCTION   Files (Media later) · Approvals                [Content, Social: later, hidden until built]
BUSINESS     Time & Costs · Finance (OWNER)                 [Freelancers, Team: after T77+]
INSIGHTS     Reports
SYSTEM       Settings · Import & Export · Audit Log (OWNER) · User Requests (OWNER) · Invitations (OWNER)
             [Automation, Integrations, System Health: later]
COLLABORATE  Chat · Notes · Notifications · Voice Notes     ← not in the Blueprint groups: needs a decision (§8 D-UX-2)
```

Rules: one registry (`navigation.ts`) carries the group; the sidebar only renders it; no entry for an unbuilt module ("coming soon" items are not shown); real icons with the existing labels.

### 5.2 Design-system direction

1. **Adopt, don't rebuild:** `PageHeader`, `DataTable`, `FilterBar`, `KpiCard`, `StatusBadge`, `DetailPanel`, states — everywhere.
2. **Add only three missing pieces:** a confirm dialog, a form-field set (label, help, error) and an icon set for the navigation. Each is small and uses the existing Tailwind tokens.
3. **Tokens only:** new and touched code uses the theme tokens (`ink`, `muted`, `line`, `accent`, `danger`, `warning`, `panel`, `canvas`); raw palette classes are replaced when a screen is touched, not in a big-bang pass.
4. **One detail pattern per object type:** full page for business objects (customer, project, invoice), side panel for quick work items (task, approval, meeting).
5. **Honest states:** loading = skeleton, error = `ErrorState` with retry, empty = `EmptyState` with the primary action; never a zero that might be a failed load (the dashboard rule, extended to all pages).

---

## 6. Priority prototype screens

Text wireframes. They use **only data the API already returns**; nothing marked here requires a new endpoint, field or metric. Role notes follow existing permissions.

### 6.1 Dashboard

```
┌ PageHeader: "Good morning, <name>"   workspace · role                [+ New task] ┐
│ KPI row (KpiCard, each links):                                                    │
│  [Overdue tasks n] [Due this week n] [Approvals waiting n] [Follow-ups due n]     │
│   — counts from my-work / calendar / approvals data already loaded; no deltas     │
│     until MetricsService (T120)                                                   │
├ Needs attention (list, max 5, "Open My Work →") ┬ Next 7 days (calendar list)     │
├ My next tasks (status badge, due, project)       ┴ Approvals waiting for you      │
├ Active projects (DataTable compact: number, customer, progress, deadline)         │
├ OWNER only: Finance KPIs (revenue, costs incl. labour, margin, "≥ / incomplete")  │
└ Recent activity (ActivityTimeline)                                                ┘
```
Changes vs today: shared components, one KPI row at the top instead of "Workspace at a glance" counts at the bottom; same data, same permissions. Workspace raw counts move to a collapsible "Workspace totals" section (they are real counts, not metrics).

### 6.2 Projects (list + detail)

```
List  (unchanged base: DataTable + FilterBar, URL filters)
 PageHeader "Projects"                                   [+ New project]
 FilterBar: search · status · customer · service · responsible · deadline
 Table: No. · Name · Customer · Service · Responsible · Progress ▓▓░ · Status · Deadline · Budget (OWNER)
 Row click → project page

Detail
 PageHeader: P-0007 · <name>   StatusBadge   customer link        [Edit] [⋯]
 Tabs: Overview · Tasks · Files · Time · Activity
  Overview: deadline, responsible, members, progress (derived), OWNER profitability preview
  Tasks:    the shared tasks table filtered to this project
  Files:    project files (existing files API)
  Time:     time entries of this project (existing /time-entries filter; cost OWNER only)
  Activity: ActivityTimeline
 Delete: styled confirm dialog (replaces confirm())
```

### 6.3 Tasks

```
 PageHeader "Tasks"                              [Kanban | List | Calendar]  [+ New task]
 FilterBar (URL): search · project · customer · status · priority · assignee · due
 Kanban:  columns TODO · IN_PROGRESS · IN_REVIEW · BLOCKED · DONE (ARCHIVED hidden by filter)
          card: title, project, assignee, due (overdue red / soon amber), subtasks n/m
 List:    DataTable: Task · Project · Customer · Assignee · Priority · Status · Due · Subtasks n/m
 Calendar: unchanged (AgencyCalendar, tasks only)
 Task opens in DetailPanel (side panel), sections: details · subtasks · labels · files · activity
   (split of the current 1 111-line modal into section components; same API calls)
```
Not included (needs data that does not exist yet): planned/actual time per task, checklist %, timer — they depend on TimeEntry per task reporting and `estimatedMinutes` (Blueprint §12, future schema task).

---

## 7. Phased implementation plan

Every phase: no API, schema, permission or workflow change; one task = one PR; web tests + build + a runtime check per role on a disposable database; screenshots in the PR.

| Phase | Scope | Gate |
|---|---|---|
| UX-0 | Runtime review of today's screens per role (OWNER, MANAGER, EMPLOYEE, CONTRACTOR, CLIENT) on a disposable DB; screenshots; confirm or correct this audit | none (read-only) |
| UX-1 | Missing primitives: confirm dialog, form fields, nav icon set; badge unification (invoice, approval onto `StatusBadge`) | none |
| UX-2 | Tasks: FilterBar with URL filters, DataTable list view, split task modal into DetailPanel sections | none |
| UX-3 | Dashboard on shared components and KPI row (same data) | none (D7 content unchanged) |
| UX-4 | Project detail tabs (Overview, Tasks, Files, Time, Activity) from existing endpoints | none |
| UX-5 | Remaining hand-built tables → DataTable (finance lists, audit, invites, user requests, opportunities, data) | none |
| UX-6 | Navigation regrouping (T69) with icons, one registry | **OWNER_GATE_PRODUCT_BEHAVIOR (T69)** |
| UX-7 | Cleanup: remove unused skeleton components with their source-text tests; replace raw palette classes on touched screens | none |
| Later | Language/i18n, dark mode, paging for tasks API, new modules | owner decisions / their own tasks |

Order rationale: UX-1 first because every later phase uses the confirm dialog and badges; Tasks before Dashboard because it is the daily screen with the biggest gaps; T69 stays separate and waits for approval.

Suggested registry entries (not created yet): UX-0 … UX-7 as W4/W6 frontend tasks; they fit Blueprint §24 ("generalised primitives before many new pages") and need no migration.

---

## 8. Risks, dependencies and owner decisions

### Risks

| Risk | Mitigation |
|---|---|
| Regressions in role visibility while restyling (e.g. a finance column shown to MANAGER) | API already omits OWNER-only fields; keep role tests per screen; runtime check per role in every PR. |
| Source-text tests break on refactors (they assert file contents) | Update the specific test in the same PR; never weaken an assertion about permissions. |
| Big-bang styling changes | Phase per screen; tokens replaced only where a screen is touched. |
| Current production state | Builds are paused by the Railway security incident; UI work can be developed and reviewed but **not deployed** until the incident response (credential rotation, T75 deploy) is complete. |

### Dependencies

MetricsService (T120) for any KPI delta; TimeEntry-per-task reporting and a schema task for planned time; T77+ for Team/Freelancers; T97/T133 for Content/Social; report engine (T123) for Reports.

### Owner decisions required

| ID | Decision | Recommendation |
|---|---|---|
| D-UX-1 | Approve T69 with the grouping in §5.1 | Approve after UX-1 (icons ready) |
| D-UX-2 | Where Chat, Notes, Notifications and Voice live (not in the Blueprint groups) | A "Collaborate" group, or Notifications only via the bell and Chat/Notes under WORK |
| D-UX-3 | Product language: English only, German, or both (i18n) | Decide before UX-1 form texts; i18n is a separate task |
| D-UX-4 | Dark mode | Defer |
| D-UX-5 | Detail pattern: side panel for tasks (§5.2 point 4) | Approve |
| D-UX-6 | Remove unused skeleton components (C9) | Approve as UX-7 |
| D-UX-7 | Approve phases UX-0 … UX-5 as ungated frontend tasks in the ledger | Approve UX-0 first |
