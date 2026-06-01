# Staging Deployment Task Checklist

## Purpose

Convert the staging deployment decision into executable tasks for UAT and 50-user load readiness.

## Repository Preparation

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-REPO-001 | Confirm selected staging provider | Product Owner / DevOps Architect | Hosting decision record | Pending |
| STG-REPO-002 | Confirm app paths: `apps/web`, `apps/api` | DevOps Architect | Deployment service mapping | Pending |
| STG-REPO-003 | Confirm build commands | Frontend Lead / Backend Lead | Build command list | Pending |
| STG-REPO-004 | Confirm no production feature flags are activated | Security Architect | Scope review note | Pending |

## Frontend Deployment

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-WEB-001 | Configure web service/project for `apps/web` | Frontend Lead / DevOps Architect | Web staging URL | Pending |
| STG-WEB-002 | Configure `NEXT_PUBLIC_APP_URL` | Frontend Lead | Env var evidence | Pending |
| STG-WEB-003 | Configure `NEXT_PUBLIC_API_URL` | Frontend Lead | Env var evidence | Pending |
| STG-WEB-004 | Run web build on provider | DevOps Architect | Build log | Pending |

## Backend Deployment

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-API-001 | Configure API service for `apps/api` | Backend Lead / DevOps Architect | API staging URL | Pending |
| STG-API-002 | Set API start command after build | Backend Lead | Runtime command evidence | Pending |
| STG-API-003 | Configure `PORT`, `NODE_ENV`, `API_BASE_URL` | DevOps Architect | Env var evidence | Pending |
| STG-API-004 | Verify `/api/health` | QA Lead | Smoke test evidence | Pending |

## Database Setup

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-DB-001 | Provision staging PostgreSQL | Database Architect | Database connection record | Pending |
| STG-DB-002 | Configure `DATABASE_URL` in API secret store | DevOps Architect | Secret reference | Pending |
| STG-DB-003 | Run Prisma validation | Backend Lead | Validation log | Pending |
| STG-DB-004 | Confirm reset policy | Database Architect / QA Lead | Reset rule note | Pending |

## Environment Variables

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-ENV-001 | Configure required web variables | Frontend Lead | Env checklist | Pending |
| STG-ENV-002 | Configure required API variables | Backend Lead / DevOps Architect | Env checklist | Pending |
| STG-ENV-003 | Mark inactive provider placeholders inactive | Security Architect | Scope review note | Pending |
| STG-ENV-004 | Confirm no secrets are committed | Security Architect | Secret review note | Pending |

## Migration Governance

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-MIG-001 | Confirm staging schema setup path | Database Architect | Migration decision note | Pending |
| STG-MIG-002 | Review tenant-owned and sensitive models | Database Architect / Security Architect | Review evidence | Pending |
| STG-MIG-003 | Document rollback/reset expectation | Database Architect | Rollback/reset note | Pending |

## Seed/Test Data

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-DATA-001 | Create two test tenants | QA Lead / Database Architect | Tenant setup evidence | Pending |
| STG-DATA-002 | Create MVP module placeholder records | QA Lead | Test data evidence | Pending |
| STG-DATA-003 | Confirm no production data is used | Security Architect | Data review note | Pending |

## Test Accounts

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-ACC-001 | Create Owner test account by invite | Product Owner / QA Lead | Account evidence | Pending |
| STG-ACC-002 | Create Manager test account by invite | Product Owner / QA Lead | Account evidence | Pending |
| STG-ACC-003 | Create Employee test account by invite | Product Owner / QA Lead | Account evidence | Pending |
| STG-ACC-004 | Create Client test account by invite | Product Owner / QA Lead | Account evidence | Pending |

## Monitoring

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-MON-001 | Enable API/web logs | DevOps Architect | Log reference | Pending |
| STG-MON-002 | Configure error tracking placeholder/provider | DevOps Architect | Monitoring evidence | Pending |
| STG-MON-003 | Confirm DB connection visibility | Database Architect | Monitoring evidence | Pending |

## Smoke Tests

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-SMOKE-001 | Verify web route loads | QA Lead | Screenshot/log reference | Pending |
| STG-SMOKE-002 | Verify `/api/health` | QA Lead | API response evidence | Pending |
| STG-SMOKE-003 | Verify role navigation boundaries | QA Lead / Security Architect | Evidence | Pending |
| STG-SMOKE-004 | Verify deferred providers are inactive | Security Architect | Scope evidence | Pending |

## 50-User Load Test

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-LOAD-001 | Select approved load tool | CTO / DevOps Architect | Tool decision | Pending |
| STG-LOAD-002 | Configure test scenarios | QA Lead | Scenario evidence | Pending |
| STG-LOAD-003 | Execute 50 concurrent users | QA Lead / DevOps Architect | Load report | Pending |
| STG-LOAD-004 | Review leakage checks under load | Security Architect / QA Lead | Security evidence | Pending |

## UAT Evidence Capture

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-UAT-001 | Execute Owner scenarios | QA Lead / Product Owner | Evidence references | Pending |
| STG-UAT-002 | Execute Manager scenarios | QA Lead | Evidence references | Pending |
| STG-UAT-003 | Execute Employee scenarios | QA Lead | Evidence references | Pending |
| STG-UAT-004 | Execute Client scenarios | QA Lead / Product Owner | Evidence references | Pending |

## Final Staging Signoff

| Task ID | Task | Owner Role | Required Output | Status |
|---|---|---|---|---|
| STG-SIGN-001 | Review staging deployment evidence | Release Manager | Signoff record | Pending |
| STG-SIGN-002 | Confirm production blockers updated | Release Manager | Blocker register update | Pending |
| STG-SIGN-003 | Decide whether production Go/No-Go can be rerun | Product Owner / CTO | Gate decision | Pending |
