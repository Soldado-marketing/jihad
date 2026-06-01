# Sprint 13 Deployment Execution Plan

## Purpose

Define the controlled deployment steps for MAOS MVP launch preparation. This document does not execute deployment.

## Deployment Preconditions

| Precondition | Owner Role | Required Evidence | Blocks Deployment |
|---|---|---|---|
| Release candidate identified | Release Manager | RC version manifest | Yes |
| Build/test/Prisma validation passed | QA Lead / Backend Lead / Frontend Lead | Validation logs | Yes |
| Environment variables reviewed | DevOps Architect | Environment checklist | Yes |
| Migration governance approved | Database Architect | Migration readiness note | Yes |
| Backup/restore readiness accepted | DevOps Architect | Backup/restore note | Yes |
| Rollback path accepted | Release Manager | Rollback checklist | Yes |
| Security signoff complete | Security Architect | Security signoff checklist | Yes |
| 50-user load gate closed or accepted | CTO / DevOps Architect / QA Lead / Product Owner | Load review or controlled-risk record | Yes |

## Deployment Sequence

| Step | Action | Owner Role | Evidence | Rollback Trigger |
|---|---|---|---|---|
| DEP-001 | Confirm release candidate version | Release Manager | Version manifest | Version mismatch |
| DEP-002 | Confirm production environment readiness | DevOps Architect | Environment checklist | Missing required variable or service |
| DEP-003 | Confirm backup snapshot plan | DevOps Architect | Backup record placeholder | Backup process unavailable |
| DEP-004 | Confirm migration plan and rollback path | Database Architect | Migration governance record | Ungoverned schema change |
| DEP-005 | Deploy web service | DevOps Architect | Deployment log | Build artifact mismatch |
| DEP-006 | Deploy API service | DevOps Architect | Deployment log | API health failure |
| DEP-007 | Deploy worker service if enabled | DevOps Architect | Deployment log | Queue/worker health failure |
| DEP-008 | Run smoke validation | QA Lead | Smoke test evidence | Critical path failure |
| DEP-009 | Confirm monitoring signals | DevOps Architect | Monitoring screenshots/log references | Missing alert coverage |
| DEP-010 | Run final launch approval | Release Manager | Go/no-go record | Any no-go gate |

## Smoke Validation Scope

- API health endpoint.
- Workspace dashboard route.
- Invite/login placeholder path.
- Projects/tasks list route.
- Client dashboard route.
- Finance owner-only route denial/visibility check.
- Reports hidden data notice.
- Voice AI placeholder notice.

## Rollback Plan Summary

- Roll back web/API/worker services to prior known-good artifact.
- Disable launch access if tenant, permission, client, finance, audit, or report privacy controls fail.
- Preserve logs and audit evidence for post-incident review.
- Notify Product Owner, CTO, QA Lead, Security Architect, DevOps Architect, and Release Manager.

## Acceptance Criteria

- Deployment sequence has named owners and rollback triggers.
- No production deployment is performed from this document.
- 50-user load gate is represented as a hard production launch precondition.
