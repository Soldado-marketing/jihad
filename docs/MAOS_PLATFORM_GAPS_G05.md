# MAOS G05 — Remaining gaps to replace Trello, ClickUp and Notion (analysis only)

**Task:** G05 (master task list, Phase 6). **Date:** 2026-11-03. **Scope:** analysis; no code. Every proposed row below is a **proposal** until the owner adds it to the master task list (decision O31). Source of truth for what is approved: `docs/MAOS_PRODUCT_BLUEPRINT.md` §43 (approved product structure) and §28/§43.4 (do not build yet).

## 1. What MAOS already covers (verified in the code on `origin/main` `de2ee1b`)

| Capability | Where | Replaces |
|---|---|---|
| Projects, tasks, subtasks, statuses (TODO → IN_PROGRESS → IN_REVIEW → DONE, BLOCKED, ARCHIVED), priority, due date, assignee, labels, sort order | `Task`, `Subtask`, `Label`; web `components/tasks/*` (kanban, list, calendar views, task modal, filters) | Trello boards and cards, ClickUp lists |
| Client-visible tasks and projects, client portal (deliveries, approvals, invoices, appointments, problems, requests [#136]) | `clientVisible`, `clientScopeKey`, `(client)/client/*` | ClickUp guest access, Trello shared boards — with real tenant and client isolation |
| My Work (per-user inbox), calendar aggregation, notifications bell, global search | `my-work`, `calendar`, `notifications`, `search` modules | ClickUp Home / Inbox, Notion reminders |
| Files with versions, approvals with decisions, deliveries with review rounds, version comparison [#144], review deadlines [#145] | `FileAsset`, `FileVersion`, `ApprovalRequest` | Trello attachments, ClickUp proofing |
| Time entries and rates, project/customer profitability | `time-entries`, `rates`, reports | ClickUp time tracking |
| CRM (leads, opportunities, follow-ups, meetings), customers | `crm`, `leads`, `opportunities`, `follow-ups`, `meetings`, `customers` | Notion CRM databases, Trello sales boards |
| Chat and internal notes, voice notes, voice-to-task draft | `chat`, `collaboration` (`InternalNote`), `voice-notes`, `voice-to-task` | ClickUp chat / comments (partly) |
| Audit log, activity timeline, member access history [#146] | `audit` | none of the three has this depth |
| CSV import/export (`POST /import/:type`, `GET /export/:type`) | `import-export` | Trello/ClickUp/Notion CSV |
| Scheduler jobs (invite expiry, deadline reminders, appointment reminders, client review reminders [#145]) | `scheduler` | ClickUp reminders |

## 2. Gaps, by what people do in Trello, ClickUp and Notion

Legend: **E** = exists in part, **M** = missing, **B** = Blueprint §43 target already, **S** = schema change (migration gate), **PR** = open PR.

### 2.1 Boards and task work (Trello / ClickUp)

| # | Gap | Today | Blueprint | Proposed row | Size | Gate |
|---|---|---|---|---|---|---|
| G05-01 | Custom board lists per project (columns beyond the six statuses) | **PR** #120 open since October (migration A) | §43.2 "saved views" | review + merge #120 | — | O7 (migration window) |
| G05-02 | Task comments as a thread with @mentions and notifications | **E** `InternalNote` per resource, chat channels; no mention → notification path confirmed | §43.2 activity timeline | T-COM-01 "Task comment thread with mentions" | M | S (mention record) or reuse `InternalNote` + `Notification` without schema |
| G05-03 | Checklists inside a task | **E** `Subtask` (title, status, assignee) | §43.2 quality control (checklist templates) | T-QC-01 "Reusable delivery checklists" | M | S (templates) |
| G05-04 | Task dependencies / blockers ("waiting on") | **M** (status BLOCKED only) | §43.2 "Task dependencies: yes" | T-DEP-01 | M | S |
| G05-05 | Saved views and filters per user; bulk actions (move, assign, label many) | **E** filters in `task-filters.ts`, not stored; no bulk | §43.2 | T-VIEW-01 (stored views), T-BULK-01 | M | views: S only if stored |
| G05-06 | Drag-and-drop ordering across lists, keyboard shortcuts | **E** `sortOrder` exists; UI DnD to confirm (M03 did not test) | — | T-UX-01 | S | none |
| G05-07 | Attachments on tasks from the task modal (link `FileAsset` to task) | **E** `Task.fileAssets` relation; UI entry to confirm | — | T-FILE-01 | S | none |
| G05-08 | Recurring tasks (weekly report, monthly invoice) | **M** | §43.2 templates + recurring work (explicit first) | T-REC-01 | L | S + O (D12) |
| G05-09 | Project and task templates | **M** | §43.2 | T-TPL-01 | L | S |
| G05-10 | Due-date reminders to staff | **E** deadline-reminders job (staff), client review reminders | — | — | — |
| G05-11 | Watchers / follow a task | **M** | — | T-WATCH-01 | S | S |
| G05-12 | Archive and restore of boards/projects with retention | **E** ARCHIVED status; no retention rules | §43.2 data archive | T-ARCH-01 | M | possibly S |

### 2.2 Planning and reporting (ClickUp)

| # | Gap | Today | Blueprint | Proposed row | Size | Gate |
|---|---|---|---|---|---|---|
| G05-13 | Goals / milestones per project | **M** | — (not in §43) | T-MS-01 | M | S + owner (scope) |
| G05-14 | Workload and capacity view | **M** | §43.2 resource planning (Phase B) | T-CAP-01 | L | after Rate/TimeEntry (exist) |
| G05-15 | Dashboards with widgets per role | **E** owner/client dashboards, reports module | §21 MetricsService | T-DASH-01 | L | MetricsService first |
| G05-16 | Custom fields on tasks | **M** | §28 forbids enum→table conversions without need | — | — | **do not build yet** without a real requirement |
| G05-17 | Automations ("when done → notify client") | **M** | §23: first 5–10 hard-coded automations after the scheduler | T-AUTO-01…05 | M | Phase G |

### 2.3 Knowledge and documents (Notion)

| # | Gap | Today | Blueprint | Proposed row | Size | Gate |
|---|---|---|---|---|---|---|
| G05-18 | Knowledge base: SOPs, client brand guidelines, onboarding docs | **M** (files only) | §43.2 "brand guidelines + knowledge base — not a Notion clone" | T-KB-01 "Simple document records with files" | L | S |
| G05-19 | Meeting notes → decisions → tasks | **E** `Meeting`, `InternalNote`; no conversion flow | §43.2 | T-MEET-01 | M | none (L04/L05 later for AI) |
| G05-20 | Service catalog and monthly packages (retainers) | **M** | §43.2 service catalog, retainers | T-SVC-01, T-PKG-01 | L | S (ServiceTemplate) |
| G05-21 | Client request center with triage → task/project | **PR** #136 (requests routed to management) | §43.2 request center | extend #136: accept → create Task/Project, status back to client | M | S for the link record |
| G05-22 | Customer 360 (one page per customer with everything) | **E** customer overview service (tasks, approvals, invoices); not the full set | §43.2 Phase A | T-C360-01 | M | none |
| G05-23 | Notion-style free-form pages / databases | **M** | §43.4: not a Notion clone; HubSpot/Notion integrations only with a use case | — | — | **do not build** |

### 2.4 Import and migration from the three tools

| # | Gap | Today | Proposed row | Gate |
|---|---|---|---|---|
| G05-24 | Import Trello JSON export (boards → projects, lists → statuses or #120 lists, cards → tasks, checklists → subtasks, labels, due dates, members by e-mail) | **M**; CSV import exists for the canonical types | T-IMP-TRELLO | none for CSV mapping; one-time tool |
| G05-25 | Import ClickUp CSV export (lists, tasks, subtasks, assignees, priorities, due dates) | **M** | T-IMP-CLICKUP | none |
| G05-26 | Import Notion CSV/Markdown export (databases → tasks/customers; pages → knowledge base once T-KB-01 exists) | **M** | T-IMP-NOTION | after T-KB-01 |

## 3. What is enough to switch (minimum replacement set)

To stop using Trello and ClickUp for day-to-day delivery work, MAOS needs **#120 merged (lists), G05-02 (comment thread with mentions), G05-03/04 (checklists as subtasks are enough; dependencies optional), G05-05 (stored views), G05-24/25 (imports)**. To stop using Notion for internal documentation, it needs **G05-18 (knowledge base) and G05-19 (meeting notes to tasks)**; service catalog and packages (G05-20) replace the planning databases.

Proposed order (phase-consistent, smallest safe steps first): G05-06/07 UI confirmations (no schema) → #120 (owner window) → G05-02 (reuse `InternalNote` + `Notification`, no schema) → G05-24/25 import tools (no schema) → G05-05 stored views (S) → G05-18 knowledge base (S) → G05-19 → G05-20/21 (S) → G05-08/09 (S, D12).

## 4. Owner decision

**O31** Add the proposed rows above to the master task list (department G or a new "N — Replacement of Trello/ClickUp/Notion"), confirm the order in §3, and answer D12 (templates/recurring before People & Money?). Until then nothing here is scheduled.
