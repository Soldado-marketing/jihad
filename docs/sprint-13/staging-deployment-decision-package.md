# Staging Deployment Decision Package

## Purpose

Give the owner a concrete hosting decision package for MAOS MVP staging/UAT so the team can run UAT evidence capture and the 50-concurrent-user load readiness gate.

## Repository Deployment Facts

| Area | Current Fact | Deployment Impact |
|---|---|---|
| Web app | `apps/web`, Next.js, scripts: `dev`, `build`, `typecheck`, `test` | Best deployed on a Next.js-aware host or container with approved runtime command |
| API app | `apps/api`, NestJS, scripts: `dev`, `build`, `start`, `test`, `prisma:validate` | Can run as Node service after `npm run build` and `npm start` |
| API prefix | Global `/api` prefix in `apps/api/src/main.ts` | API base URL should end at host root; routes begin with `/api` |
| Database | PostgreSQL via Prisma schema | Staging requires managed PostgreSQL or approved PostgreSQL instance |
| Env files | No committed `.env` files found for apps | Secrets must be configured in hosting platform secret store |
| Load tooling | No executable load-test tool found | Tool must be selected and approved before 50-user test |

## Recommended Staging Architecture

Recommended default for fastest UAT and load gate:

- Frontend: Vercel Pro or equivalent Next.js-capable hosting for `apps/web`.
- Backend: Render Web Service, Railway service, DigitalOcean App Platform service, or equivalent Node service for `apps/api`.
- Database: Managed PostgreSQL in the same provider/region as API where practical.
- Monitoring: Platform logs plus error tracking/logging placeholder configured before test execution.
- Region: EU-first staging/UAT region unless explicitly accepted as risk.

This keeps Next.js deployment straightforward and keeps the API/database in a managed environment suitable for 50 concurrent users.

## Frontend Hosting Options

| Option | Fit | Pros | Cons | 50-User Suitability |
|---|---|---|---|---|
| Vercel Pro | Strong fit for Next.js | Native Next.js deployment, preview deployments, CDN, simple env var setup | Separate backend/database host unless using another platform for API | Suitable |
| Render Web Service | Good if using one provider | One vendor for web/API/database, logs, rollback | Requires production-like Next runtime command review for `apps/web` | Suitable if configured |
| Railway service | Good for all-in-one staging | Monorepo support, service variables, easy service composition | Usage-based cost requires spend monitoring | Suitable if sized correctly |
| DigitalOcean App Platform | Good for more traditional app hosting | Managed app/container path, managed database options | Slightly more setup than Vercel for Next.js | Suitable |

## Backend Hosting Options

| Option | Fit | Pros | Cons | 50-User Suitability |
|---|---|---|---|---|
| Render Web Service | Strong staging fit | Simple Node service deployment, health checks, logs, managed Postgres nearby | Starter instances may need upgrade after load test | Suitable on Starter/Standard |
| Railway service | Strong staging fit | Easy Node service, variables, logs, Postgres plugin/path | Usage-based billing needs budget guard | Suitable on Pro or controlled Hobby |
| DigitalOcean App Platform | Strong scalable fit | App service plus managed DB, predictable platform model | Requires more explicit setup | Suitable on paid app instance |
| Fly.io Machines | Strong technical fit | Regions, private networking, scaling path | More operational setup | Suitable if team is comfortable with Fly |

## PostgreSQL Hosting Options

| Option | Fit | Pros | Cons | 50-User Suitability |
|---|---|---|---|---|
| Render Postgres | Simple with Render API | Managed Postgres, connection limits by plan, PITR on paid plans | Cross-provider latency if web/API elsewhere | Suitable on Starter/Standard |
| Railway Postgres/open-source DB service | Simple all-in-one | Same project as services, easy variables | Usage and backup details must be reviewed before production | Suitable for staging |
| Neon | Good managed Postgres option | Branching and pooled connections are useful for staging | Separate provider from app host | Suitable if region and pooling fit |
| DigitalOcean Managed PostgreSQL | Scalable managed DB | Managed backups and predictable infra model | More setup and cost than smallest staging options | Suitable and scalable |
| Supabase Postgres | Good if team wants Supabase tooling | Managed Postgres plus optional auth/storage/realtime services | Extra platform features should remain inactive for MVP | Suitable if only Postgres is used |

## Recommended Simple Stack

| Layer | Recommendation | Rationale |
|---|---|---|
| Web | Vercel Pro | Best fit for Next.js staging without adding app code |
| API | Render Starter or Standard Web Service | Simple Node/NestJS deployment with logs and health checks |
| Database | Render Postgres Starter or Standard | Keeps API and DB close and simple |
| Monitoring | Platform logs plus configured error/log placeholders | Enough for UAT and first 50-user test |

Recommended simple monthly band: USD 40-100 depending on API/database size and usage.

## Recommended Scalable Stack

| Layer | Recommendation | Rationale |
|---|---|---|
| Web | Vercel Pro or DigitalOcean App Platform static/web service | Scales frontend separately |
| API | Render Standard/Pro, Railway Pro, or DigitalOcean paid app service | Allows vertical scaling and clearer production path |
| Database | Render Standard/Postgres, Neon paid plan, or DigitalOcean Managed PostgreSQL | Better connection and backup posture |
| Monitoring | Platform metrics plus dedicated error/log provider | Needed for 100/250/500 scaling path |

Recommended scalable monthly band: USD 100-300+ depending on compute, DB tier, logging, and traffic.

## Cost Band Notes

Pricing changes over time. Validate before purchase.

| Stack | Approximate Monthly Band | Source Basis |
|---|---:|---|
| Cheapest acceptable staging | USD 25-60 | Railway Hobby/Pro minimum usage or Render Starter API/Postgres with minimal monitoring |
| Recommended simple staging | USD 40-100 | Vercel Pro plus Render Starter/Standard API and Postgres |
| More scalable staging/UAT | USD 100-300+ | Standard/Pro API, larger Postgres, monitoring/logging, higher traffic |
| Production-like prelaunch | USD 200-500+ | Dedicated app services, larger managed DB, stronger monitoring and backups |

Reference pricing sources:

- Vercel pricing: https://vercel.com/pricing
- Render pricing: https://render.com/pricing
- Railway pricing: https://railway.com/pricing
- DigitalOcean App Platform pricing: https://www.digitalocean.com/pricing/app-platform
- Neon pricing: https://neon.com/pricing
- Supabase pricing: https://supabase.com/pricing

## Deployment Complexity

| Stack | Complexity | Notes |
|---|---|---|
| Vercel web + Render API/Postgres | Low/Medium | Easiest Next.js path; cross-provider API URL and CORS/env setup required |
| Railway all-in-one | Low | Simplest single provider; review usage budget and backup posture |
| Render all-in-one | Medium | Simple one provider if Next.js runtime command is confirmed |
| DigitalOcean App Platform + Managed DB | Medium | More setup, stronger production-like path |
| Fly.io + Managed Postgres | High | Good technical control, higher ops burden |

## Suitability For 50 Concurrent Users

| Stack | Suitability | Required Before Test |
|---|---|---|
| Vercel + Render Starter | Likely acceptable for MVP placeholder load | Confirm API latency and DB connection behavior under test |
| Vercel + Render Standard | Stronger staging baseline | Confirm route and DB metrics |
| Railway Pro all-in-one | Acceptable if sized and spend-capped | Confirm CPU/RAM/DB metrics and backups |
| DigitalOcean paid app + managed DB | Strong fit | Confirm app instance and DB tier sizing |

## Scalability Path

| Target | Required Change |
|---:|---|
| 50 users | One web host, one API instance, managed Postgres, basic monitoring |
| 100 users | Upgrade API instance or replicas, confirm DB connection pooling, tune indexes |
| 250 users | Add API horizontal scaling, queue/backpressure review, slow query profiling |
| 500 users | Dedicated scaling review, stronger managed DB tier, load test automation, caching review |

## Required Environment Variables And Secrets

| Category | Required |
|---|---|
| Web | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL` |
| API | `NODE_ENV`, `PORT`, `API_BASE_URL`, `SESSION_SECRET`, `TENANT_MODE` |
| Database | `DATABASE_URL`, optional `SHADOW_DATABASE_URL` for non-production validation |
| Monitoring | `ERROR_TRACKING_DSN`, `LOGGING_PROVIDER_TOKEN` or provider equivalent |
| Email/invite | `EMAIL_PROVIDER_API_KEY` if provider is approved; otherwise controlled fallback |
| Inactive placeholders | Storage, AI, transcription, payment, realtime variables must remain inactive unless approved |

## Required Database Setup

- Managed PostgreSQL staging/UAT instance.
- Synthetic or sanitized test data only.
- At least two tenants for isolation checks.
- Owner/Manager/Employee/Client account coverage.
- Backup/restore expectation documented before production.
- Production migration governance remains separate from staging setup.

## Required Test Accounts

| Account | Role | Purpose |
|---|---|---|
| Owner | `OWNER` | Finance, dashboard, reports, admin paths |
| Manager | `MANAGER` | CRM, reports without Owner-only finance |
| Employee | `EMPLOYEE` | Internal project/task/collaboration paths |
| Client | `CLIENT` | Client portal, client project/task/invoice/payment paths |

## Required Monitoring And Logging

- API health and latency.
- Web errors.
- API error rate.
- Database connection behavior.
- Security-sensitive denied access events.
- Tenant/client/finance/report privacy markers.
- Load test report storage.

## Required Backup/Restore Setup

- Staging/UAT reset policy.
- Production backup/restore readiness before launch.
- Restore point before any production migration.
- Rollback or forward-fix expectation documented.

## Decision Recommendation

Choose one of these before staging execution:

1. Fastest practical path: Vercel Pro for web + Render API/Postgres.
2. Cheapest acceptable single-provider path: Railway Pro or tightly budgeted Railway Hobby for staging only.
3. Most scalable pre-production path: DigitalOcean App Platform or Render Standard/Pro services with managed PostgreSQL.

Production launch status remains No-Go until deployment decision, staging/UAT execution, 50-user load review, UAT evidence, migration governance, and production readiness are closed.
