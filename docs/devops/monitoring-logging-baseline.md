# MAOS Monitoring And Logging Baseline

## Purpose

Define the minimum observability baseline required before Sprint 1 starts.

## Frontend Error Tracking

| Requirement | Baseline |
|---|---|
| Runtime errors | Capture route, build version, browser/device class, and safe error category |
| Privacy | Do not capture secrets, full request bodies, file contents, chat content, voice transcripts, or payment data |
| Environments | Separate local, QA, staging, UAT, and production streams |

## Backend/API Logs

| Requirement | Baseline |
|---|---|
| Request logs | Request ID, route, status, latency, environment, safe tenant/actor references where permitted |
| Error logs | Error category, stack trace where safe, correlation ID, outcome |
| Permission events | Sensitive denied attempts are logged safely |
| Redaction | Raw secrets, payment data, payroll data, AI prompt payloads, and file content are excluded |

## Worker Logs

| Requirement | Baseline |
|---|---|
| Job lifecycle | Queued, started, completed, failed, retried, dead-lettered |
| Context | Tenant and actor/effective actor context where applicable |
| Provider failures | AI, transcription, email, storage, and payment provider failures categorized |

## Queue Metrics

Track job count, wait time, execution time, failure count, retry count, dead-letter count, and worker health once queues are introduced.

## Uptime Checks

| Target | Requirement |
|---|---|
| Web | Availability check |
| API | Health/readiness check |
| Worker | Worker liveness and processing check |
| Database | Connectivity check without data exposure |
| Queue/cache | Availability check once introduced |

## Sensitive Log Redaction

Sensitive logging defaults to minimum necessary metadata. If detailed payload capture is needed for debugging, it must be explicitly approved, redacted, temporary, and disabled after use.

## Alerting Expectations

| Alert Type | Owner |
|---|---|
| Production outage | DevOps Architect / Release Manager |
| API error spike | Backend Lead / DevOps Architect |
| Queue failure spike | Backend Lead / DevOps Architect |
| Security-sensitive error | Security Architect |
| Audit logging failure | Security Architect / CTO |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Frontend error tracking baseline is documented | Met |
| Backend/API logging baseline is documented | Met |
| Worker logging baseline is documented | Met |
| Queue metrics are documented | Met |
| Uptime checks are documented | Met |
| Sensitive log redaction is documented | Met |
| Alerting expectations are documented | Met |
