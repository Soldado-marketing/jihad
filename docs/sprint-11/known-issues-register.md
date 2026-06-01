# Sprint 11 Known Issues Register

## Purpose

Track release-relevant issues discovered during Sprint 11 hardening.

## Known Issues

| Issue ID | Severity | Area | Description | Impact | Owner Role | Status | Release Decision |
|---|---|---|---|---|---|---|---|
| KI-001 | Low | Product scope | MVP uses placeholders for external providers, report runs, signed URLs, realtime, AI/transcription, and payments | Expected MVP limitation; no production integration is active | Product Owner | Accepted | Non-blocking |
| KI-002 | Low | Data persistence | Prisma schema is validated, but production migrations are intentionally not created in Sprint 11 | Release candidate must use approved migration governance before production | Database Architect | Accepted | Sprint 12 gate |
| KI-003 | Low | UAT evidence | Manual UAT evidence is not captured in repository until UAT execution starts | UAT execution must attach screenshots/log references before launch | QA Lead | Open | Sprint 12 gate |

## Issue Severity Rules

| Severity | Definition | Release Impact |
|---|---|---|
| Critical | Tenant, permission, client, finance, AI, report, or audit leakage | Blocks Sprint 12 |
| High | Broken MVP path or failed build/test gate | Blocks Sprint 12 |
| Medium | Usability or evidence gap with mitigation | Conditional Sprint 12 |
| Low | Placeholder limitation or documentation follow-up | Non-blocking if accepted |

## Exit Criteria

- No critical or high issue remains open.
- Medium issues have owner, mitigation, and target gate.
- Low issues are explicitly accepted or assigned forward.
