# ADR-013: Backup And Recovery Strategy

Status: Approved

## Context

MAOS needs a backup and recovery baseline before Sprint 0 closes. Sprint 1 can start with a documented baseline and placeholders, but production launch requires validated backup/restore procedures and recovery drills.

## Decision

Approve a baseline backup and recovery strategy for PostgreSQL, future object storage, and release readiness. Final cadence and RPO/RTO targets must be validated before production launch.

## Database Backup Baseline

| Area | Baseline |
|---|---|
| Database | PostgreSQL backups required for shared environments |
| Cadence | Placeholder cadence documented in backup/restore plan; final cadence before production |
| Environment | QA/staging/prod backup expectations differ by data sensitivity |
| Restore | Restore drill required before MVP launch |

## Object Storage Backup/Versioning Assumptions

Object storage should support versioning or equivalent recovery controls before file workflows become production-critical. Final details depend on object storage provider selection.

## Restore Drill Expectation

At minimum, staging restore must be tested before production launch. Restore evidence must include source backup, restored environment, validation result, timestamp, owner, and issues found.

## RPO/RTO Placeholders

| Metric | Placeholder |
|---|---|
| RPO | To be finalized before production launch |
| RTO | To be finalized before production launch |
| Owner | DevOps Architect / Database Architect |

## Launch Readiness Gate

Production launch is blocked until backup cadence, restore process, RPO/RTO, and restore drill evidence are approved.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Database backup baseline is documented | Met |
| Object storage backup/versioning assumptions are documented | Met |
| Restore drill expectation is documented | Met |
| RPO/RTO placeholders are documented | Met |
| Launch readiness gate is documented | Met |

## Open Questions

| Question | Owner Role | Gate |
|---|---|---|
| Final backup cadence | DevOps Architect / Database Architect | Before production launch |
| Final RPO/RTO | CTO / DevOps Architect | Before MVP release candidate |
| Object storage backup/versioning details | DevOps Architect / Security Architect | Sprint 6 file implementation gate |
