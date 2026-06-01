# MAOS Documentation Structure

## Purpose

Define documentation locations and naming rules for MAOS MVP implementation readiness.

## Documentation Locations

| Documentation Type | Location |
|---|---|
| ADRs | `docs/adr` |
| Sprint docs | `docs/sprint-0` |
| Standards | `docs/standards` |
| QA docs | `docs/qa` |
| Security docs | `docs/security` |
| Release docs | `docs/release` |
| DevOps docs | `docs/devops` |

## Naming Rules

| Document Type | Naming Rule |
|---|---|
| ADR | `ADR-###-short-title.md` |
| Standard | `short-title-standard.md` or descriptive kebab-case |
| Sprint summary | `day-#-summary.md` |
| Strategy/baseline | Descriptive kebab-case |
| Tracking document | Descriptive kebab-case |

## Maintenance Rules

| Rule | Requirement |
|---|---|
| ADR log | Update when ADR status changes |
| Decision tracker | Update when decisions close, remain proposed, or are assigned forward |
| Day summary | Create at end of each Sprint 0 day |
| No code | Documentation must not include implementation code unless explicitly requested later |
| No SQL/migrations | Sprint 0 docs must not create SQL or migration scripts |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| ADR location is documented | Met |
| Sprint docs location is documented | Met |
| Standards location is documented | Met |
| QA docs location is documented | Met |
| Security docs location is documented | Met |
| Release docs location is documented | Met |
| Naming rules are documented | Met |
