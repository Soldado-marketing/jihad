# MAOS navigation audit (M01) — 2026-11-03

Purpose: the audit the sidebar regroup (M02) is built from. Documentation only; no code changes. Target groups per the Master Development Plan: **Workspace · Company & Team · Projects & Delivery · Customers & CRM · Finance & Banking · AI Assistant · Reports · Settings**.

Source of truth: `apps/web/src/navigation/navigation.ts` (items, `allowedRoles`, `grants`) and `apps/web/src/components/shell/sidebar.tsx` (`navGroups`: the four groups shown today). The compact mobile menu shares both (`visibleNavGroups`). Role visibility is a UI convenience only; the API enforces every permission. CLIENT never sees the workspace menu (the workspace layout sends CLIENT to `/client`).

## Items today (main `de2ee1b`) → target group (M02)

| id | Label | Route | Roles (`allowedRoles` + grants) | Group today | Target group | Note |
|---|---|---|---|---|---|---|
| dashboard | Dashboard | `/dashboard` | OWNER, MANAGER, EMPLOYEE, CONTRACTOR | Workspace | Workspace | — |
| control-center | All my companies | `/control-center` | OWNER | Workspace | Workspace | multi-company overview |
| my-work | My Work | `/my-work` | OWNER, MANAGER, EMPLOYEE, CONTRACTOR | Workspace | Workspace | — |
| calendar | Calendar | `/calendar` | OWNER, MANAGER, EMPLOYEE, CONTRACTOR | Workspace | Workspace | — |
| notifications | Notifications | `/notifications` | OWNER, MANAGER, EMPLOYEE | Team | Workspace | personal inbox, not a team tool |
| chat | Chat | `/chat` | OWNER, MANAGER, EMPLOYEE | Team | Workspace | internal only |
| collaboration | Collaboration | `/collaboration` | OWNER, MANAGER, EMPLOYEE | Team | Workspace | internal only |
| team (E01, PR #137) | Team & Access | `/team` | OWNER | Workspace | Company & Team | replaces company-access, admin-users, admin-invites |
| company-access (pre-E01) | Company Access | `/dashboard/admin/company-access` | OWNER | Workspace | Company & Team | → `/team/members` |
| admin-users (pre-E01) | User Requests | `/dashboard/admin/users/requests` | OWNER | Workspace | Company & Team | → `/team/requests` |
| admin-invites (pre-E01) | Invitations | `/dashboard/admin/invites` | OWNER | Workspace | Company & Team | → `/team/invitations` |
| audit | Audit Log | `/audit` | OWNER | Operations | Company & Team | who did what |
| projects | Projects | `/projects` | OWNER, MANAGER, EMPLOYEE, CONTRACTOR | Delivery | Projects & Delivery | — |
| tasks | Tasks | `/tasks` | OWNER, MANAGER, EMPLOYEE, CONTRACTOR | Delivery | Projects & Delivery | — |
| time | Time & Costs | `/time` | OWNER, MANAGER, EMPLOYEE, CONTRACTOR | Delivery | Projects & Delivery | — |
| files | Files | `/files` | OWNER, MANAGER, EMPLOYEE | Operations | Projects & Delivery | — |
| approvals | Approvals | `/approvals` | OWNER, MANAGER, EMPLOYEE | Operations | Projects & Delivery | — |
| voice | Voice Notes | `/voice` | OWNER, MANAGER, EMPLOYEE | Operations | Projects & Delivery | voice → task drafts |
| complaints | Problem reports | `/complaints` | OWNER, MANAGER | Operations | Projects & Delivery | from clients |
| requests (D02, PR #136) | Work requests | `/requests` | OWNER, MANAGER | Operations | Projects & Delivery | from clients |
| customers | Customers | `/customers` | OWNER, MANAGER, EMPLOYEE | Delivery | Customers & CRM | — |
| crm | CRM | `/crm` | OWNER, MANAGER | Delivery | Customers & CRM | — |
| finance | Finance | `/finance` | OWNER | Operations | Finance & Banking | — |
| invoices | Invoices | `/finance/invoices` | grants `invoices-read`, `invoices-edit`, `payments-record` (no role) | Operations | Finance & Banking | managers with a grant |
| reports | Reports | `/reports` | OWNER, MANAGER | Operations | Reports | — |
| data | Import & export | `/data` | OWNER, MANAGER, EMPLOYEE, CONTRACTOR | Operations | Settings | — |
| settings | Settings | `/settings` | OWNER, MANAGER, EMPLOYEE, CONTRACTOR | Operations | Settings | — |
| client-placeholder | Client workspace | `#client-portal-deferred` | CLIENT (deferred, hidden) | — | — | never rendered |

AI Assistant group: appears only when phase L ships (no item today).

## Per-role view (target grouping)

| Group | OWNER | MANAGER | EMPLOYEE | CONTRACTOR |
|---|---|---|---|---|
| Workspace | Dashboard, All my companies, My Work, Calendar, Notifications, Chat, Collaboration | Dashboard, My Work, Calendar, Notifications, Chat, Collaboration | same as MANAGER | Dashboard, My Work, Calendar |
| Company & Team | Team & Access, Audit Log | — | — | — |
| Projects & Delivery | Projects, Tasks, Time & Costs, Files, Approvals, Voice Notes, Problem reports, Work requests | same | Projects, Tasks, Time & Costs, Files, Approvals, Voice Notes | Projects, Tasks, Time & Costs |
| Customers & CRM | Customers, CRM | Customers, CRM | Customers | — |
| Finance & Banking | Finance | Invoices (only with a grant) | — | — |
| Reports | Reports | Reports | — | — |
| Settings | Import & export, Settings | same | same | same |

Constraints for M02: routes and `allowedRoles` untouched; every nav id keeps a slot (ops-dashboard test); the string `/notifications` stays out of client files (sprint-7); no `/reports/i` in client-portal source (sprint-4); `QUICK_NAV_IDS` (dashboard, projects, tasks) unchanged (compact-navigation test).

## Findings

1. **Four groups today, eight tomorrow.** "Operations" holds ten unrelated items (files, approvals, problem reports, voice, finance, invoices, reports, audit, data, settings); "Team" holds communication tools, not team administration. The target grouping separates company administration, delivery work, customers, money, reports and settings.
2. **Owner-only administration is scattered.** Company Access, User Requests and Invitations sit in Workspace (E01 consolidates them under one `team` entry, PR #137) and the Audit Log sits in Operations; all four belong in Company & Team.
3. **Role visibility needs no change.** `allowedRoles` already yield the intended per-role view (table above); M02 is a group-only change in `sidebar.tsx` (`navGroups`, `navGlyphs`), nothing in `navigation.ts`.
4. **Grant-based items keep working.** `invoices` has no role and shows through grants; the group filter runs after the permission filter (`visibleNavGroups`), so a regroup cannot widen visibility.
5. **AI Assistant** has no item until phase L ships; the group must appear only when it has at least one visible item (`visibleNavGroups` already drops empty groups).
6. **Pending PRs that add items:** #136 adds `requests` (Work requests, OWNER/MANAGER) to Operations; #137 replaces three admin ids with `team`. M02 must give both a slot (ops-dashboard test: every non-deferred nav id has a slot) whichever merges first.

## M02 acceptance (from this audit)

- `navGroups` lists exactly the eight target labels in order, AI Assistant allowed to be empty and therefore hidden.
- Every non-deferred id in `navigation.ts` (including `team` and `requests` once merged) appears in exactly one group.
- Routes, `allowedRoles` and `grants` unchanged; CLIENT sees no workspace group; CONTRACTOR sees Workspace (Dashboard, My Work, Calendar), Projects & Delivery (Projects, Tasks, Time & Costs) and Settings only.
- Existing tests stay green: `ops-dashboard` (slots), `compact-navigation` (`QUICK_NAV_IDS`, shared filter), `sprint-7` (no `/notifications` in client files), `sprint-4` (no `/reports/i` in client-portal source), `invites` (`team`/`admin-invites` slot), `global-search` (OWNER quick actions).
