# MAOS Railway Staging Decision

## Final Decision

MAOS will be deployed independently for staging/UAT using Railway all-in-one.

Railway staging will host:

- `apps/web`
- `apps/api`
- PostgreSQL database

SandAroma, WordPress, and WooCommerce are out of scope and must be ignored completely for MAOS staging.

## Why Railway Is Selected For Staging

| Reason | Explanation |
|---|---|
| Independent MAOS deployment | Keeps MAOS separate from unrelated websites and commerce systems |
| Fast staging setup | Railway can host app services and PostgreSQL in one project |
| Simple service composition | Web, API, and database can share project-level environment management |
| Suitable for UAT | Provides reachable staging URLs for UAT evidence capture |
| Suitable for 50-user readiness test | Adequate for MVP placeholder load if service sizing and DB behavior pass testing |
| Cost control | Staging can start small and scale after evidence |

## What Railway Will Host

| Railway Service | Repository Path | Purpose |
|---|---|---|
| MAOS Web | `apps/web` | Next.js staging frontend |
| MAOS API | `apps/api` | NestJS staging API with `/api` global prefix |
| MAOS PostgreSQL | Railway PostgreSQL service | Staging/UAT database |

## What Remains Inactive

| Area | Status |
|---|---|
| SandAroma | Ignored |
| WordPress | Ignored |
| WooCommerce | Ignored |
| Production architecture | Deferred |
| DNS changes | Not performed |
| Real external storage provider | Inactive |
| Real AI provider | Inactive |
| Real transcription provider | Inactive |
| Real payment provider | Inactive |
| Real realtime provider | Inactive |
| Production migrations | Not created |

## Expected Cost Band

Expected Railway staging band: USD 25-100/month depending on:

- Railway plan.
- Service CPU/RAM usage.
- PostgreSQL usage.
- Log/egress usage.
- Load test duration and traffic.

The owner should set usage alerts or spend controls before running load tests.

## Suitability For 50 Concurrent Users

Railway all-in-one is suitable for staging validation of 50 concurrent users if:

- `apps/web` and `apps/api` deploy successfully.
- Railway PostgreSQL remains stable under test.
- API p95/p99, error rate, failed requests, and DB connection behavior meet thresholds.
- Tenant, permission, client, finance, report, AI/voice, and signed URL safety checks pass under load.

## Scaling Path After Load Test

| Target | Railway Action |
|---:|---|
| 50 users | Run current staging services and review metrics |
| 100 users | Increase API service resources or add replicas if supported by chosen setup |
| 250 users | Review DB sizing, connection pooling, slow queries, and API scaling |
| 500 users | Revisit production architecture decision and consider stronger managed DB/app topology |

## Production Architecture Decision

Production architecture is deferred until after:

- Railway staging deployment succeeds.
- UAT evidence is captured.
- 50-concurrent-user load readiness review is completed.
- Migration governance is approved.
- Production environment readiness is verified.

Current production launch decision remains No-Go.
