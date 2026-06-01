# Staging/UAT Environment Setup Plan

## Purpose

Prepare a safe staging or UAT environment for MAOS MVP launch gate execution without deploying automatically or activating real external providers.

## Required Services

| Service | Required For | Owner Role | Notes |
|---|---|---|---|
| Web app | UAT and frontend load journeys | DevOps Architect / Frontend Lead | `apps/web` Next.js app |
| API app | API load journeys and backend validation | DevOps Architect / Backend Lead | `apps/api` NestJS app with `/api` global prefix |
| PostgreSQL | Prisma-backed MVP data models | Database Architect | Staging/UAT database only, no production data |
| Redis/queue | Future queue paths and placeholder readiness | DevOps Architect | Required only if queue behavior is enabled for UAT |
| Monitoring/logging | Launch gate evidence | DevOps Architect | Needed for API logs, web errors, DB behavior |
| Email provider or invite fallback | Invite-only UAT | Product Owner / DevOps Architect | Provider activation requires approval; fallback must be controlled |

## Startup Commands

| App | Local/Staging Command | Production-Like Command | Notes |
|---|---|---|---|
| `apps/api` | `npm run dev` | `npm run build` then `npm start` | API listens on `PORT` or `3001`; global prefix is `/api` |
| `apps/web` | `npm run dev` | `npm run build`; production hosting must define approved start/runtime path | `apps/web` currently has no package-level `start` script |

## Database Requirement

| Requirement | Rule |
|---|---|
| Database engine | PostgreSQL |
| Data source | Synthetic or sanitized staging/UAT data only |
| Production data | Not allowed in staging/UAT unless separately governed and sanitized |
| Prisma validation | Must pass before gate execution |
| Migration governance | Must be approved before production launch |
| Reset | Allowed only with QA/Release Manager coordination if evidence has been captured |

## Environment Variables

| Variable Category | Example Name | Required For Staging/UAT | Owner Role |
|---|---|---:|---|
| Runtime environment | `NODE_ENV` | Yes | DevOps Architect |
| API public/base URL | `API_BASE_URL` | Yes | DevOps Architect |
| Web public URL | `NEXT_PUBLIC_APP_URL` | Yes | Frontend Lead |
| Web public API URL | `NEXT_PUBLIC_API_URL` | Yes | Frontend Lead |
| PostgreSQL connection | `DATABASE_URL` | Yes | Database Architect |
| Session secret | `SESSION_SECRET` | Yes | Security Architect |
| Redis connection | `REDIS_URL` | If queue enabled | DevOps Architect |
| Email provider key | `EMAIL_PROVIDER_API_KEY` | If provider is approved | DevOps Architect |
| Error tracking | `ERROR_TRACKING_DSN` | Yes for launch gate | DevOps Architect |
| Logging provider | `LOGGING_PROVIDER_TOKEN` | Yes for launch gate | DevOps Architect |

Deferred provider variables for AI, transcription, payment, realtime, and external storage must remain inactive unless explicitly approved.

## Test Data Requirements

| Data Area | Required Test Data |
|---|---|
| Tenant | At least two tenants to validate tenant isolation |
| Owner account | One Owner for finance and admin journeys |
| Manager account | One Manager for CRM/reports without owner-only finance |
| Employee account | One Employee for internal workspace journeys |
| Client account | One Client scoped to client-safe portal data |
| Projects/tasks | Tenant-scoped project, task, and subtask placeholder data |
| CRM | Lead, opportunity, meeting, follow-up placeholder data |
| Files/approvals | File metadata/version and approval placeholder data |
| Chat/notifications | Internal channel and notification placeholder data |
| Voice | Voice note and draft placeholder data |
| Finance | Owner-only revenue, costs, invoices, and payments placeholder data |
| Reports | Report definition/run placeholder data with hidden data suppression |

## Seed Data Requirement

No seed command was confirmed in package scripts. If seed data is needed, create it through an approved staging/UAT setup process with:

- No production data.
- Tenant IDs on tenant-owned data.
- Owner/Manager/Employee/Client role coverage.
- Client own-scope data.
- Finance data scoped to Owner-only validation.
- Evidence of setup retained for QA.

## URL Placeholders

| URL | Placeholder |
|---|---|
| Staging web URL | `https://staging.maos.example` |
| UAT web URL | `https://uat.maos.example` |
| Staging API URL | `https://staging-api.maos.example/api` |
| UAT API URL | `https://uat-api.maos.example/api` |

## Account Requirements

| Account | Required Purpose |
|---|---|
| Owner | Finance, dashboard, reports, project/task, admin guide validation |
| Manager | CRM, reports without owner finance, collaboration |
| Employee | Internal workspace, tasks, collaboration, chat, voice |
| Client | Client dashboard, client projects/tasks, client invoice/payment views |

## Rollback/Reset Requirement

- Staging/UAT reset must be coordinated with QA and Release Manager.
- Evidence must be exported or linked before reset.
- Any migration or schema reset requires Database Architect approval.
- Any privacy/security failure requires environment freeze until reviewed.

## Setup Status

Status: Prepared as a plan. Execution is pending staging/UAT target, environment variables, database setup, test data, and account provisioning.
