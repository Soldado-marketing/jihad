# Sprint 13 Admin Operating Guide

## Purpose

Provide launch-time operating guidance for MAOS MVP administrators.

## Operating Boundaries

- MVP is a controlled launch with placeholder integrations.
- External AI, transcription, payment, storage, and realtime providers are not activated unless separately approved.
- Client portal, finance, reports, and files retain visibility boundaries.
- Deferred features remain out of scope.

## Daily Admin Tasks

| Task | Owner Role | Frequency | Evidence |
|---|---|---|---|
| Review known issues | Release Manager | Daily during launch week | Known issue register update |
| Review monitoring alerts | DevOps Architect | Daily | Monitoring checklist |
| Review user invite requests | Product Owner | As needed | Invite request record |
| Review failed or blocked user access | QA Lead / Support Owner | Daily | Support ticket or evidence |
| Review security-sensitive events | Security Architect | Daily during launch week | Audit/log review note |
| Review finance access requests | Finance Owner | As needed | Access decision record |

## Admin Workflows

| Workflow | Allowed In MVP | Notes |
|---|---:|---|
| Tenant setup | Yes | Governed first Owner path only |
| User invite | Yes | Invite-only, no public registration |
| Role assignment | Yes | MVP roles only |
| Project/task management | Yes | Internal users only |
| Client portal access | Yes | Client-safe surfaces only |
| Finance access | Yes | Owner-only |
| Report viewing | Yes | No export, hidden data suppression |
| AI/voice | Placeholder only | No external provider calls |
| Payment processing | No | Manual placeholder only |
| Advanced automation | No | Deferred |

## Escalation Rules

- Tenant, permission, client data, finance, audit, or report privacy issue: escalate immediately to CTO and Security Architect.
- Failed production deployment or rollback uncertainty: escalate immediately to DevOps Architect and Release Manager.
- UAT or launch acceptance concern: escalate to Product Owner and QA Lead.

## Acceptance Criteria

- Admin operators can identify allowed and deferred workflows.
- Escalation paths are clear for launch-critical issues.
- No guide step requires adding new product scope.
