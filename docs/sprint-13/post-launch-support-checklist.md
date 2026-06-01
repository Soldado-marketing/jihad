# Sprint 13 Post-Launch Support Checklist

## Purpose

Define the first support operating checklist after MAOS MVP launch.

## Launch Week Support Cadence

| Timeframe | Activity | Owner Role | Evidence |
|---|---|---|---|
| Launch day | Monitor deployment, uptime, invite flow, core routes | Release Manager / DevOps Architect | Launch log |
| First 24 hours | Review alerts, support tickets, known issues | Support Owner / QA Lead | Support review note |
| First 3 business days | Review user feedback and triage defects | Product Owner / QA Lead | Triage board |
| First week | Review performance, security, and rollback readiness | CTO / Security Architect / DevOps Architect | Launch week review |

## Support Checklist

| Support ID | Check | Owner Role | Trigger | Required Action |
|---|---|---|---|---|
| SUP-001 | Invite failures | Product Owner / Support Owner | User cannot accept invite | Verify invite status and fallback path |
| SUP-002 | Access denied issue | QA Lead / Security Architect | Role sees wrong access | Check role, tenant, and permission evidence |
| SUP-003 | Client data issue | Security Architect | Client sees unexpected data | Escalate as Critical |
| SUP-004 | Finance access issue | Finance Owner / Security Architect | Non-Owner sees finance data | Escalate as Critical |
| SUP-005 | Report hidden data issue | Security Architect | Hidden totals exposed | Escalate as Critical |
| SUP-006 | Performance degradation | DevOps Architect | Latency/error thresholds exceeded | Review monitoring and rollback trigger |
| SUP-007 | Build/deployment issue | Release Manager | Deployment instability | Follow rollback baseline |
| SUP-008 | Placeholder confusion | Product Owner | User expects deferred feature | Clarify MVP scope and log feedback |

## Hotfix Support Rules

- Critical and High issues follow the hotfix/rollback baseline.
- Hotfixes require minimum targeted validation.
- Product scope expansion is not allowed through support triage.
- Every production-impacting issue must have owner, severity, mitigation, and decision.

## Acceptance Criteria

- Support owners know launch-week responsibilities.
- Critical privacy/security issues have immediate escalation.
- Deferred features remain controlled through scope governance.
