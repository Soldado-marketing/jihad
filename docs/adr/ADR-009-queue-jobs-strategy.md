# ADR-009: Queue And Jobs Strategy

Status: Proposed

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
