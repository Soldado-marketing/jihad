# Production Environment Readiness Plan

## Purpose

Define what must be verified before MAOS MVP can move from staging/UAT readiness to production launch.

## Production Readiness Requirements

| Area | Requirement | Owner Role | Status |
|---|---|---|---|
| Hosting | Approved hosting platform with web, API, and worker deployment path | DevOps Architect | Pending |
| Database | Production PostgreSQL with backup and access controls | Database Architect | Pending |
| Environment variables | Required variables configured in secret storage | DevOps Architect / Security Architect | Pending |
| Domain | Production web and API domains configured | DevOps Architect | Pending |
| Monitoring | Web/API errors, latency, uptime, DB connections, security alerts | DevOps Architect | Pending |
| Backup/restore | Backup plan and restore expectation accepted | DevOps Architect | Pending |
| Migration governance | Production migration review and rollback/forward-fix plan | Database Architect | Pending |
| Security signoff | Tenant, permission, audit, client, finance, report gates accepted | Security Architect | Pending |
| UAT evidence | Owner/Manager/Employee/Client UAT evidence captured | QA Lead / Product Owner | Pending |
| Load readiness | 50-user load review passed or controlled risk accepted | CTO / DevOps Architect / QA Lead | Pending |
| Final owner approval | Product and launch acceptance | Product Owner | Pending |

## Hosting Required

- Web runtime for `apps/web`.
- API runtime for `apps/api`.
- Worker runtime path if workers are enabled.
- EU-first region preference unless accepted as risk.
- Rollback-capable deployment mechanism.

## Database Required

- PostgreSQL production instance.
- Restricted operational access.
- Backup or restore point before launch.
- Tenant and sensitive-table review before migration execution.

## Environment Variables Required

Use `docs/sprint-13/environment-variable-checklist.md` as the source of truth. No secret values should be committed to the repository.

## Domain Required

| Domain | Purpose |
|---|---|
| Production web domain | User-facing MAOS MVP |
| Production API domain | Backend API base URL |
| Monitoring domain/dashboard | Operational visibility |

## Monitoring Required

- API health.
- API p95/p99 latency.
- Error rate.
- Web errors.
- Database connections.
- Security-sensitive denial spikes.
- Tenant/client/finance/report privacy markers.

## Final Approval Required

Production launch cannot proceed until:

- Build/test/Prisma validation passes.
- UAT evidence is closed or explicitly accepted.
- Migration governance is closed.
- 50-user load gate is passed or controlled risk is accepted.
- No Critical or High blocker remains open.
- Product Owner, CTO, QA Lead, Security Architect, DevOps Architect, and Release Manager approve final Go.

## Current Status

Status: Plan prepared. Production environment readiness is not verified.
