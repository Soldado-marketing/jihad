# ADR-009: Queue And Jobs Strategy

Status: Proposed (2026-09); worker plan superseded for the current architecture by D8 (2026-10-13), see "Amendment" below

## Context

MAOS will need background jobs for AI, voice transcription, notifications, reports, automations, file processing, and provider integrations. Sprint 1 does not require full worker implementation, but the strategy must preserve tenant context, actor context, permission revalidation, retry limits, and dead-letter visibility.

## Decision

Use Redis/BullMQ or an equivalent queue/job system for MVP background jobs when worker-backed workflows begin. Jobs that create records, send notifications, or touch sensitive data must be idempotent and permission-aware.

## Redis/BullMQ Or Equivalent Baseline

| Requirement | Baseline |
|---|---|
| Queue engine | Redis/BullMQ or equivalent |
| Worker boundary | `apps/worker` |
| Job metadata | Tenant context, actor/effective actor, correlation ID, idempotency key where needed |
| Monitoring | Queue metrics and failed job visibility required |
| Provider failures | AI, transcription, email, storage, and payment failures categorized |

## Tenant/Actor Context In Jobs

Jobs must preserve tenant context and actor/effective actor context. Sensitive jobs must revalidate permissions before execution rather than relying only on creation-time checks.

## Retry Policy

Each job type must define retry count, backoff strategy, retryable failure categories, non-retryable failure categories, and user/admin visibility rules.

## Dead-Letter Expectation

Jobs that exhaust retries must move to a dead-letter state with safe error details, tenant context, owner/operator visibility, and remediation workflow.

## Permission Revalidation For Sensitive Jobs

Jobs touching client-facing data, files, finance, AI, reports, audit, or notifications must revalidate permissions and resource scope before execution.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Redis/BullMQ or equivalent baseline is documented | Met |
| Tenant/actor context in jobs is documented | Met |
| Retry policy expectation is documented | Met |
| Dead-letter expectation is documented | Met |
| Permission revalidation for sensitive jobs is documented | Met |
| Final queue/provider implementation is assigned forward | Met |

## Open Questions

| Question | Owner Role | Gate |
|---|---|---|
| Confirm queue provider/hosting | Backend Lead / DevOps Architect | Before first worker-backed feature |
| Define first concrete job retry matrix | Backend Lead / QA Lead | Sprint 8 voice/AI or earlier if jobs start sooner |
| Define dead-letter admin UI timing | Product Owner / DevOps Architect | Post-MVP unless required by MVP workflow |

## Amendment 2026-10-13: D8 supersedes the separate-worker plan (current architecture)

History is kept above unchanged: this ADR proposed Redis/BullMQ (or an equivalent) with a separate `apps/worker`.

**Owner decision D8** (approved in principle 2026-10-11, implemented in MAOS-D8 #64, enabled in production 2026-10-13) chose the lowest-complexity option instead, and it is now the architecture of record:

- Background jobs run **in-process inside the API** (`apps/api/src/modules/scheduler`), on intervals. No worker service, no queue, no Redis, no new dependency or secret.
- Each run is one database transaction that first takes `pg_try_advisory_xact_lock(<MAOS>, <job>)`, so with several API instances **only one instance executes a job per round**; the others skip. A job never overlaps itself on one instance; a failing job rolls back and the next round runs.
- Switched on by `MAOS_SCHEDULER_ENABLED=true` (exact value; off by default).
- Run outcomes are structured log lines (`scheduled_job_*`, error class only). Durable run/failure records (T125) need a table and stay migration-gated.

What still applies from this ADR to every job: tenant context on every row a job touches, idempotency for anything that creates records or notifications (the reminders job uses the notification writer's dedupe key), and permission/recipient revalidation for sensitive work (the notification writer re-checks ACTIVE membership and audience).

When to revisit: a worker-backed workload (long AI/transcription jobs, provider retries with backoff, dead-letter handling) or measurable API latency from jobs. Moving to a queue would need a new decision and owner approval (new service, Railway impact).
