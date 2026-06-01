# MAOS Role-Aware Navigation Standard

## Purpose

Define role-aware navigation expectations for the MVP frontend.

## Navigation Scope

| Role | Navigation Baseline |
|---|---|
| Owner | Workspace, CRM, projects, tasks, clients, collaboration, files, voice, finance, reports, settings |
| Manager | Assigned/granted projects, tasks, CRM, collaboration, files, reports, settings as granted |
| Employee | Assigned projects/tasks, collaboration, files, voice notes, personal dashboard |
| Client | Client portal, own projects, own tasks/approvals where visible, own files, client chat, own invoices/payments where visible |

## Hidden Item Behavior

Navigation items for unauthorized modules should be hidden by default. If product UX requires visible disabled items later, the disabled state must not reveal hidden counts, totals, names, or internal details.

## Denied-State Behavior

Denied states must be generic and safe. They may state that access is unavailable, but must not reveal whether a hidden tenant/client/project/file/report exists.

## Client-Safe Navigation

Client navigation must never include internal workspace modules, audit logs, payroll, employee costs, internal reports, internal chat, or unapproved files.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Owner navigation is documented | Met |
| Manager navigation is documented | Met |
| Employee navigation is documented | Met |
| Client navigation is documented | Met |
| Hidden item behavior is documented | Met |
| Denied-state behavior is documented | Met |
| Client-safe navigation is documented | Met |
