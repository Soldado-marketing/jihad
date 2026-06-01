# ADR-012: Observability And Monitoring Strategy

Status: Approved

## Context

MAOS needs operational visibility before Sprint 1 implementation starts. The MVP will begin as a modular monolith with web, API, worker, PostgreSQL, queue/cache, object storage integration, and later AI, finance, reporting, and realtime workflows. Monitoring must support debugging and release governance without exposing secrets, tenant data, client data, financial data, payroll data, file contents, or sensitive AI prompts.

## Decision

Approve a provider-neutral observability baseline for Sprint 0. Final provider selection may remain assigned forward, but Sprint 1 cannot start unless the required logging, error tracking, alerting, and sensitive log rules are documented and owned.

## Frontend Monitoring Baseline

| Area | Baseline |
|---|---|
| Error tracking | Capture frontend runtime errors, route context, build version, and browser/device metadata where safe |
| User context | Use tenant/user identifiers only when permitted and avoid raw personal or client-confidential payloads |
| Performance | Track page load, route transition, and client-side API failure rates |
| Privacy | Do not collect secrets, full request bodies, file content, chat content, voice transcripts, or payment data |
| Environments | Local, QA, staging, UAT, and production telemetry must be separable |

## Backend/API Monitoring Baseline

| Area | Baseline |
|---|---|
| API logs | Capture request ID, route, status, latency, tenant ID where safe, actor ID where safe, and error category |
| Error tracking | Capture unhandled exceptions with redacted stack/context |
| Metrics | Track latency, error rate, request volume, permission-denied rates, and dependency failures |
| Security | Unauthorized access attempts for sensitive routes must be logged safely |
| Correlation | API, worker, audit, and queue logs should share correlation IDs where practical |

## Worker/Queue Monitoring Baseline

| Area | Baseline |
|---|---|
| Job metrics | Track queued, active, completed, failed, retried, and dead-lettered jobs |
| Context | Jobs must carry tenant context and actor/effective actor context where applicable |
| Failure visibility | Failed sensitive jobs cannot fail silently |
| Provider failures | AI, transcription, email, storage, and future payment provider failures must be categorized |
| Redaction | Worker logs must redact sensitive payloads and provider secrets |

## Error Tracking

| Requirement | Rule |
|---|---|
| Error grouping | Errors should be grouped by service, route/job, version, and environment |
| Severity | Security, tenant isolation, finance, client portal, and audit failures are high severity by default |
| Ownership | DevOps Architect owns platform errors; module owners own domain errors |
| Release link | Errors must identify deployed version/build where practical |

## Uptime Checks

| Target | Requirement |
|---|---|
| Web | Health check for frontend availability |
| API | Health check for API availability and dependency readiness |
| Worker | Worker liveness and queue processing visibility |
| Database | Connection and migration-state visibility without exposing schema or data |
| Queue/cache | Queue/cache availability checks once introduced |

## Sensitive Log Protection

Logs must not store:

- Raw secrets, tokens, passwords, recovery codes, or session secrets.
- Full payment data, full invoice payloads, or sensitive finance details.
- Payroll data unless governed by Owner/security-grant access and redaction.
- Full AI prompts/responses containing sensitive data unless governed by AI retention rules.
- File contents, chat message bodies, voice audio, or full transcripts by default.
- Cross-tenant or client-confidential payloads.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Frontend monitoring baseline is documented | Met |
| Backend/API monitoring baseline is documented | Met |
| Worker/queue monitoring baseline is documented | Met |
| Error tracking expectations are documented | Met |
| Uptime checks are documented | Met |
| Sensitive log protection is documented | Met |
| Sprint 1 can proceed with provider-neutral baseline if a provider owner/gate exists | Met |

## Open Questions

| Question | Owner Role | Gate |
|---|---|---|
| Select final monitoring/logging provider | DevOps Architect | Day 5A assigned-forward decision or before production deployment |
| Select frontend error tracking provider | Frontend Lead / DevOps Architect | Before frontend implementation exits Sprint 2 |
| Confirm production alert routing | DevOps Architect / Release Manager | Before MVP release candidate |
