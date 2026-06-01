# Production Launch Blocker Register

## Purpose

Track open production launch blockers after Sprint 13 launch preparation.

| Blocker ID | Severity | Area | Description | Owner Role | Required Action | Next Action | Status | Launch Decision Impact |
|---|---|---|---|---|---|---|---|---|
| PLB-001 | High | 50-user load readiness | 50-concurrent-user load test has not been executed and no load report exists | DevOps Architect / QA Lead | Execute 50-user load review in staging/UAT or complete approved controlled-risk acceptance | Select approved load tool, provision staging/UAT target, run 50-user test, attach report | Open | Blocks Production Go |
| PLB-002 | High | UAT evidence | UAT scenario evidence with screenshot/log references has not been captured | QA Lead / Product Owner | Execute UAT scenarios and attach evidence, or process explicit release governance acceptance | Prepare UAT accounts/test data, run UAT-001 through UAT-010, attach screenshot/log references | Open | Blocks Production Go |
| PLB-003 | High | Migration governance | Production migration governance decision is not closed | Database Architect | Complete tenant/sensitive table review, backup expectation, rollback plan, lower-environment execution, and release note impact | Complete migration governance status review and approve or reject production migration path | Open | Blocks Production Go |
| PLB-004 | High | Production environment readiness | Production environment variables, secrets, monitoring, and deployment target readiness are not verified in this workspace | DevOps Architect | Complete production environment readiness review and attach evidence | Verify hosting, domains, secret storage, monitoring, backup/restore, and environment variables | Open | Blocks Production Go |
| PLB-005 | High | Controlled-risk acceptance | Controlled-risk record is unsigned if 50-user test cannot be executed before launch | CTO / DevOps Architect / QA Lead / Product Owner | Complete controlled-risk record with mitigation, time limit, follow-up test, and approvals | Decide whether to execute load test or seek formal controlled-risk acceptance with signed owners | Open | Blocks Conditional Go if load test is skipped |
| PLB-006 | High | Staging deployment decision | Railway all-in-one staging has been selected, but deployment is not yet executed | Product Owner / DevOps Architect | Execute Railway staging setup and attach evidence | Execute Railway manual deployment runbook | In progress | Prerequisite for PLB-001, PLB-002, and PLB-004 |
| PLB-007 | High | Railway deployment | Railway web/API services are not deployed | DevOps Architect | Deploy `apps/web` and `apps/api` to Railway staging | Execute Railway manual deployment runbook and deploy web/API services | Open | Blocks UAT and load testing |
| PLB-008 | High | Railway PostgreSQL setup | Railway PostgreSQL is not configured for staging | Database Architect / DevOps Architect | Provision Railway PostgreSQL and connect `DATABASE_URL` to API | Add PostgreSQL service and validate API database connection | Open | Blocks API staging validation |
| PLB-009 | High | Railway env vars | Railway staging env vars are not configured | DevOps Architect / Security Architect | Configure required env vars and inactive placeholders | Configure env vars from `railway-env-var-values-to-fill.md` | Open | Blocks staging deployment |
| PLB-010 | High | Staging smoke tests | Staging smoke tests have not run | QA Lead | Run web/API smoke checks after Railway deployment | Run `railway-smoke-test-checklist.md`, then execute 50-user load test and capture UAT evidence | Open | Blocks UAT and load testing |

## Prerequisite Mapping

| Prerequisite | Required Before | Reason |
|---|---|---|
| PLB-006 Railway staging selected | PLB-001 50-user load readiness | Load test needs a reachable Railway staging target |
| PLB-006 Railway staging selected | PLB-002 UAT evidence | UAT needs Railway web/API URLs, accounts, test data, and evidence target |
| PLB-006 Railway staging selected | PLB-004 Production environment readiness | Production readiness depends on Railway staging findings |
| PLB-007 Railway deployment | PLB-001 and PLB-002 | UAT and load tests require deployed web/API services |
| PLB-008 Railway PostgreSQL setup | PLB-001, PLB-002, and PLB-003 | UAT, load testing, and migration governance require staging DB evidence |
| PLB-009 Railway env vars | PLB-007 | Web/API services require environment configuration before reliable deployment |
| PLB-010 Staging smoke tests | PLB-001 and PLB-002 | Load and UAT should only start after smoke tests pass |

## Severity Rules

| Severity | Launch Decision |
|---|---|
| Critical | Production No-Go |
| High | Production No-Go |
| Medium | Conditional Go only with accepted risk |
| Low | Go if accepted or assigned forward |

## Current Launch Decision

Production decision: No-Go.

## Acceptance Criteria

- No High blocker remains open before Production Go.
- Controlled-risk acceptance is not used for privacy, tenant leakage, client leakage, owner finance leakage, audit redaction failure, or hidden report total leakage.
