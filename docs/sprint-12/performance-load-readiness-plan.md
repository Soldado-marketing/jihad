# Sprint 12 Performance And Load Readiness Plan

## Purpose

Prepare MAOS MVP for an initial target of 50 concurrent users and define a practical scaling path for future growth.

## Load Targets

| Target | Purpose | Required Before |
|---:|---|---|
| 50 concurrent users | MVP launch baseline | Sprint 13 launch or controlled-risk acceptance |
| 100 concurrent users | Early growth checkpoint | Post-MVP scale review |
| 250 concurrent users | Scaling checkpoint | Infrastructure/database tuning review |
| 500 concurrent users | Future growth checkpoint | Dedicated performance engineering review |

## Critical User Journeys To Test

| Journey | User Role | Notes |
|---|---|---|
| Login/invite access | Owner/Manager/Employee/Client | Validate invite-only and session placeholder flow |
| Dashboard load | Owner/Manager/Employee | Validate summary placeholders and hidden data behavior |
| Projects/tasks list | Owner/Manager/Employee | Validate core delivery lists |
| Client portal load | Client | Validate client-safe navigation and summaries |
| CRM list | Owner/Manager | Validate lead/opportunity list placeholders |
| Files/approvals list | Owner/Manager/Employee | Validate file metadata and approvals placeholders |
| Chat/notifications placeholder load | Owner/Manager/Employee | Validate internal channel and notification placeholders |
| Voice notes list | Owner/Manager/Employee | Validate placeholder and human review messaging |
| Finance owner-only pages | Owner | Validate owner-only finance page access path |
| Reports dashboard | Owner/Manager | Validate report list and hidden total suppression |

## API Load Test Scenarios

| Scenario | Endpoint Group | Expected Behavior |
|---|---|---|
| Identity smoke | `/api/health`, invite/session placeholders | Stable response under baseline load |
| Dashboard/report read | `/api/dashboards/*`, `/api/reports` | Permission-filtered placeholder responses |
| Project/task read | `/api/projects`, `/api/tasks` | Tenant-scoped responses |
| Client portal read | `/api/client/*` | Client-safe responses only |
| Finance owner-only read | `/api/finance/*`, `/api/invoices`, `/api/payments` | Owner-only access marker preserved |
| File/approval read | `/api/files`, `/api/approvals` | Signed URL placeholder remains permission-gated |
| Chat/notification read | `/api/chat/channels`, `/api/notifications` | Minimal payload placeholders |
| Voice read | `/api/voice-notes`, `/api/voice-to-task-drafts` | No provider calls or automatic task creation |

## Frontend Performance Scenarios

- Initial workspace shell load.
- Dashboard page load.
- Reports page load.
- Client portal home load.
- Project/task list route load.
- Finance owner-only route load.
- Voice notes route load.

## Database Load Risks

- Tenant-owned list queries can become slow without tenant indexes.
- Report summaries can become expensive when replaced with real aggregates.
- Finance summary reads can create sensitive aggregate leakage if caching is not permission-aware.
- Chat/notification lists can grow quickly and require pagination.

## Slow Query Candidates

- Project/task list with filters.
- Client portal project/task list.
- CRM lead/opportunity list.
- File version history.
- Notification list.
- Report run aggregations.
- Finance summary queries.

## Required Index Review

- Confirm tenantId indexes exist on tenant-owned MVP tables.
- Confirm common tenant/status indexes for tasks, invoices, payments, files, approvals, notifications, and reports.
- Confirm report and dashboard models include tenant indexes.
- Review slow query evidence after first 50-user load test.

## Caching Candidates

- Workspace dashboard summary per tenant and role.
- Client dashboard summary per tenant and client scope.
- Report definition list per tenant and role.
- Navigation metadata per role.

Caching must use tenant-aware, role-aware, permission-safe keys and must not cache sensitive hidden aggregates for unauthorized roles.

## Rate Limiting Strategy

- Apply conservative per-session and per-IP limits to auth, invite, report run, signed URL, voice transcription, and future AI endpoints.
- Sensitive endpoints should fail closed and log safe audit/operational markers.
- Rate limit tuning must not expose tenant or client existence.

## Queue And Backpressure Strategy

- Worker/queue capacity must be reviewed for voice transcription, AI extraction, report runs, notifications, and file-processing placeholders before real providers activate.
- Backpressure should return safe user-facing pending/failure states.
- No finance, file, report, client-facing, or AI job may fail silently.

## Monitoring And Alerting Requirements

- API error rate.
- API p95/p99 latency.
- Web page load timing.
- Database connection usage.
- Slow endpoint list.
- Queue depth and failed jobs once workers are active.
- Uptime checks.
- Sensitive log redaction checks.

## Acceptable Response-Time Targets

| Surface | 50-User Baseline Target |
|---|---:|
| API p95 for read placeholders | <= 500 ms |
| API p99 for read placeholders | <= 1000 ms |
| Web route p95 local/staging render | <= 1500 ms |
| Error rate | < 1% |
| Failed requests | 0 critical-path failures |

Targets are placeholders for Sprint 12 readiness and must be refined after real deployment telemetry.

## Failure Thresholds

- Error rate >= 1% on critical journeys.
- Any tenant, permission, client, finance, AI, signed URL, or report privacy leak.
- Sustained API p95 above target without accepted risk.
- Database connection saturation.
- Failed UAT critical path.

## Rollback Trigger If Performance Fails

If performance testing fails after deployment to staging/UAT, Sprint 13 launch is blocked unless CTO, DevOps Architect, QA Lead, and Product Owner accept the issue as controlled risk with mitigation and monitoring.

## Scaling Path

| Target | Required Readiness |
|---:|---|
| 50 users | Current MVP placeholders, tenant indexes, guarded routes, basic monitoring, and load review |
| 100 users | Review API scaling, DB connection pooling, dashboard/report caching candidates |
| 250 users | Add query profiling, worker scaling, queue backpressure tuning, stricter rate limiting |
| 500 users | Dedicated scaling review, managed database sizing, horizontal API/web scaling, load test automation |

## Launch Rule

No production launch is allowed unless the 50-concurrent-user load readiness review is completed or explicitly accepted as a controlled risk.
