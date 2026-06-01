# Railway Staging Setup Checklist

## Purpose

Checklist for creating a Railway all-in-one staging/UAT environment for MAOS MVP.

## Railway Project Creation

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-PROJ-001 | Create Railway account or use approved workspace | Product Owner / DevOps Architect | Pending |
| RAIL-PROJ-002 | Create Railway project named `maos-staging` or equivalent | DevOps Architect | Pending |
| RAIL-PROJ-003 | Set usage alerts/spend controls before load testing | Product Owner / DevOps Architect | Pending |

## Repository Connection

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-REPO-001 | Connect GitHub repository to Railway | DevOps Architect | Pending |
| RAIL-REPO-002 | Confirm Railway can access monorepo paths | DevOps Architect | Pending |
| RAIL-REPO-003 | Confirm SandAroma/WordPress/WooCommerce are not connected | DevOps Architect | Pending |

## Web Service For `apps/web`

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-WEB-001 | Create Railway service for `apps/web` | DevOps Architect / Frontend Lead | Pending |
| RAIL-WEB-002 | Set service root/working directory to `apps/web` | DevOps Architect | Pending |
| RAIL-WEB-003 | Set build command to `npm run build` | Frontend Lead | Pending |
| RAIL-WEB-004 | Define start/runtime command for Next.js staging | Frontend Lead / DevOps Architect | Resolved: `npm start` runs `next start` |
| RAIL-WEB-005 | Configure `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL` | Frontend Lead | Pending |

## API Service For `apps/api`

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-API-001 | Create Railway service for `apps/api` | DevOps Architect / Backend Lead | Pending |
| RAIL-API-002 | Set service root/working directory to `apps/api` | DevOps Architect | Pending |
| RAIL-API-003 | Set build command to `npm run build` | Backend Lead | Pending |
| RAIL-API-004 | Set start command to `npm start` | Backend Lead | Pending |
| RAIL-API-005 | Configure health check against `/api/health` | QA Lead / DevOps Architect | Pending |

## PostgreSQL Database

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-DB-001 | Add Railway PostgreSQL service | Database Architect / DevOps Architect | Pending |
| RAIL-DB-002 | Connect `DATABASE_URL` to API service | DevOps Architect | Pending |
| RAIL-DB-003 | Confirm no production data is used | Security Architect | Pending |
| RAIL-DB-004 | Confirm staging reset and backup expectation | Database Architect | Pending |

## Environment Variables

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-ENV-001 | Configure required web env vars | Frontend Lead | Pending |
| RAIL-ENV-002 | Configure required API env vars | Backend Lead / DevOps Architect | Pending |
| RAIL-ENV-003 | Configure inactive provider placeholders | Security Architect | Pending |
| RAIL-ENV-004 | Confirm no secrets are committed | Security Architect | Pending |

## Migration Governance

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-MIG-001 | Confirm staging schema setup path | Database Architect | Pending |
| RAIL-MIG-002 | Validate Prisma schema before deployment | Backend Lead | Pending |
| RAIL-MIG-003 | Document production migration remains separate | Database Architect | Pending |

## Seed/Test Data

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-DATA-001 | Create staging tenants and role accounts through approved process | QA Lead / Product Owner | Pending |
| RAIL-DATA-002 | Create placeholder MVP module records | QA Lead | Pending |
| RAIL-DATA-003 | Capture setup evidence | QA Lead | Pending |

## Test Accounts

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-ACC-001 | Create Owner test account | Product Owner / QA Lead | Pending |
| RAIL-ACC-002 | Create Manager test account | Product Owner / QA Lead | Pending |
| RAIL-ACC-003 | Create Employee test account | Product Owner / QA Lead | Pending |
| RAIL-ACC-004 | Create Client test account | Product Owner / QA Lead | Pending |

## Monitoring

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-MON-001 | Verify Railway logs for web/API | DevOps Architect | Pending |
| RAIL-MON-002 | Configure monitoring/error placeholders if approved | DevOps Architect | Pending |
| RAIL-MON-003 | Confirm DB connection behavior visibility | Database Architect | Pending |

## Smoke Tests

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-SMOKE-001 | Verify web staging URL loads | QA Lead | Pending |
| RAIL-SMOKE-002 | Verify API `/api/health` responds | QA Lead | Pending |
| RAIL-SMOKE-003 | Verify frontend can reach API URL | QA Lead / Frontend Lead | Pending |
| RAIL-SMOKE-004 | Verify inactive providers remain inactive | Security Architect | Pending |

## 50-User Load Test

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-LOAD-001 | Select approved load test tool | CTO / DevOps Architect | Pending |
| RAIL-LOAD-002 | Configure 50-user scenarios | QA Lead | Pending |
| RAIL-LOAD-003 | Run 50-concurrent-user test | QA Lead / DevOps Architect | Pending |
| RAIL-LOAD-004 | Attach load report to launch gate evidence | Release Manager | Pending |

## UAT Evidence

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-UAT-001 | Run Owner UAT scenarios | QA Lead / Product Owner | Pending |
| RAIL-UAT-002 | Run Manager UAT scenarios | QA Lead | Pending |
| RAIL-UAT-003 | Run Employee UAT scenarios | QA Lead | Pending |
| RAIL-UAT-004 | Run Client UAT scenarios | QA Lead / Product Owner | Pending |

## Rollback/Reset Plan

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-RB-001 | Confirm Railway redeploy/rollback path | DevOps Architect | Pending |
| RAIL-RB-002 | Confirm staging database reset rule | Database Architect / QA Lead | Pending |
| RAIL-RB-003 | Confirm evidence export before reset | QA Lead | Pending |

## Final Staging Signoff

| Task ID | Task | Owner Role | Status |
|---|---|---|---|
| RAIL-SIGN-001 | Approve staging deployment evidence | Release Manager | Pending |
| RAIL-SIGN-002 | Update production launch blocker register | Release Manager | Pending |
| RAIL-SIGN-003 | Decide whether to rerun production Go/No-Go | Product Owner / CTO | Pending |
