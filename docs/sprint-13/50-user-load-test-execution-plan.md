# 50-User Load Test Execution Plan

## Purpose

Define the safe execution package for the MAOS MVP 50-concurrent-user load readiness gate.

## Target

| Field | Value |
|---|---|
| Concurrent users | 50 |
| Environment | Staging or UAT |
| Launch requirement | Must pass before Production Go unless formally accepted as controlled risk |
| External providers | Must remain inactive unless explicitly approved |

## Duration And Ramp-Up

| Phase | Duration | Virtual Users | Purpose |
|---|---:|---:|---|
| Warm-up | 2 minutes | 5 | Confirm target and monitoring |
| Ramp-up | 5 minutes | 5 to 50 | Detect early saturation |
| Sustained load | 15 minutes | 50 | Capture steady-state metrics |
| Cool-down | 3 minutes | 50 to 0 | Confirm recovery |

## Tested URLs And Endpoints

| Journey | Web URL Placeholder | API Endpoint Group |
|---|---|---|
| Login/invite access | `/auth/invite`, `/auth/login` | `/api/invites/*`, `/api/sessions/*`, `/api/health` |
| Dashboard | `/dashboard` | `/api/dashboards/workspace-summary` |
| Projects/tasks | `/projects`, `/tasks` | `/api/projects`, `/api/tasks` |
| Client portal | `/client`, `/client/projects`, `/client/tasks` | `/api/client/projects`, `/api/client/tasks` |
| CRM | `/crm`, `/crm/leads`, `/crm/opportunities` | `/api/crm/leads`, `/api/crm/opportunities` |
| Files/approvals | `/files`, `/approvals` | `/api/files`, `/api/approvals` |
| Chat/notifications | `/chat`, `/notifications` | `/api/chat/channels`, `/api/notifications` |
| Voice list | `/voice`, `/voice/task-drafts` | `/api/voice-notes`, `/api/voice-to-task-drafts` |
| Finance owner-only | `/finance`, `/finance/invoices`, `/finance/payments` | `/api/finance/*`, `/api/invoices`, `/api/payments` |
| Reports | `/reports` | `/api/reports`, `/api/reports/:id/run` |

## Metrics To Capture

| Metric | Required Evidence |
|---|---|
| Average response time | Load report |
| p95 response time | Load report |
| p99 response time | Load report |
| Error rate | Load report |
| Failed requests | Load report |
| API logs | Log references |
| Web errors | Error tracking or browser console references |
| Database connection behavior | DB monitoring or connection metrics |
| CPU/memory if available | Hosting/infra metrics |
| Tenant/client/finance leakage checks | QA/security evidence |

## Pass/Fail Thresholds

| Threshold | Pass Criteria | Fail Criteria |
|---|---|---|
| API p95 | <= 500 ms for placeholder reads | Sustained > 500 ms without accepted risk |
| API p99 | <= 1000 ms for placeholder reads | Sustained > 1000 ms without accepted risk |
| Web route p95 | <= 1500 ms in staging/UAT | Sustained > 1500 ms without accepted risk |
| Error rate | < 1% | >= 1% on critical journeys |
| Failed critical requests | 0 | Any failed critical-path request |
| Database connections | No saturation | Saturation or connection failures |
| Privacy/security | No tenant, client, finance, report, AI/voice, or signed URL leakage | Any leakage or permission bypass |

## Required Safety Checks

- No cross-tenant data appears under load.
- Client users see only client-safe data.
- Manager/Employee/Client do not see Owner-only finance.
- Hidden report counts/totals remain suppressed.
- AI/transcription provider calls remain placeholder-only.
- Voice-to-task does not create tasks without human confirmation.
- Signed URL placeholder remains permission-gated.

## Launch Impact

- Pass: 50-user gate can be closed if UAT, migration, environment, and blocker gates are also closed.
- Fail: Production launch remains No-Go until mitigated and retested.
- Not executed: Production launch remains No-Go unless controlled-risk acceptance is completed and approved.
