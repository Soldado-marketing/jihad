# MAOS Repository Standard

## Status

Approved for Sprint 0 Day 2

## Repository Structure

MAOS uses a monorepo structure for MVP delivery.

| Path | Purpose | Day 1 Status |
|---|---|---|
| `apps/web` | Frontend web application for internal workspace and client portal | Created |
| `apps/api` | Backend API application boundary | Created |
| `apps/worker` | Background worker application boundary | Created |
| `packages/shared` | Shared utilities and domain-neutral helpers | Created |
| `packages/config` | Shared configuration standards | Created |
| `packages/types` | Shared type and API contract definitions | Created |
| `docs/adr` | Architecture Decision Records and ADR log | Created |
| `docs/sprint-0` | Sprint 0 summaries, trackers, and readiness artifacts | Created |
| `docs/standards` | Repository and implementation standards | Created |
| `docs/qa` | QA evidence and validation assets | Created |
| `docs/security` | Security, permission, audit, and tenant isolation standards | Created |
| `docs/release` | Release, hotfix, rollback, and readiness governance | Created |

Existing root-level application files are not moved during Sprint 0. Moving existing implementation into `apps/web` requires a later scoped task with tests, review, and rollback notes.

## Monorepo Standard

| Standard | Requirement |
|---|---|
| Repository model | Monorepo |
| Architecture style | Modular monolith |
| Application boundaries | `apps/web`, `apps/api`, and `apps/worker` |
| Shared package boundaries | `packages/shared`, `packages/config`, and `packages/types` |
| Documentation boundaries | `docs/adr`, `docs/sprint-0`, `docs/standards`, `docs/qa`, `docs/security`, and `docs/release` |
| Source movement | Existing implementation must not be moved without a scoped migration task |

## Current Root Next.js App Handling

The repository currently contains an existing root-level Next.js application. During Sprint 0 setup:

| Rule | Requirement |
|---|---|
| No move during Sprint 0 Day 2 | Root `app`, `components`, `lib`, `styles`, and root config files remain in place |
| Future `apps/web` migration | Must be planned as a separate task with tests and review |
| No silent ownership change | Existing root app is not automatically treated as final MAOS `apps/web` implementation |
| No production feature work | Sprint 0 changes are limited to setup, standards, ADRs, and governance |

## Naming Rules

| Item | Rule |
|---|---|
| Directories | Lowercase kebab-case unless framework conventions require otherwise |
| Markdown documents | Lowercase kebab-case for new standards and ADR files |
| ADR files | `ADR-###-short-title.md` |
| Sprint artifacts | Day or sprint prefix where useful, such as `day-1-summary.md` |
| Packages | Lowercase descriptive names under `packages/` |
| Application boundaries | `apps/web`, `apps/api`, and `apps/worker` only for MVP |

## Branch Strategy

The repository should use a simple MVP-safe branch strategy.

| Branch Type | Rule |
|---|---|
| Main branch | Protected release-ready branch |
| Feature branches | Short-lived branches for task or story work |
| Naming | `sprint-0/<task-id>-short-title` or `feature/<story-id>-short-title` |
| Hotfix branches | `hotfix/<issue-id>-short-title` once the hotfix path is approved |
| Direct commits to main | Not allowed after branch protection is configured |

## Branch Naming

| Branch Purpose | Naming Rule |
|---|---|
| Sprint setup | `sprint-0/<task-id>-short-title` |
| Feature work | `feature/<story-id>-short-title` |
| Bug fix | `fix/<issue-id>-short-title` |
| Hotfix | `hotfix/<issue-id>-short-title` |
| Documentation | `docs/<task-id>-short-title` |

## Protected Branch Policy

| Policy | Requirement |
|---|---|
| Protected main | Main branch should require review before merge once repository hosting is configured |
| Required checks | Typecheck, lint, test, and security checks once CI/CD is available |
| Required review | At least one technical review; sensitive areas require named role review |
| No force push | Force-push to protected branches is not allowed |
| Release readiness | Release or launch branches must follow release governance once defined |

## Pull Request Rules

| Rule | Requirement |
|---|---|
| One purpose per PR | PRs should focus on one task, story, or tightly related change set |
| Description required | PR must describe scope, risks, validation, and affected modules |
| Acceptance criteria | PR must reference task acceptance criteria |
| Security note | Required for auth, permissions, tenant, audit, client portal, finance, AI, reporting, files, or jobs |
| QA evidence | Required when a task has QA acceptance requirements |
| No unrelated refactors | Avoid refactoring outside the task scope |
| No production feature work during Sprint 0 setup | PRs in Sprint 0 must not implement product modules or production workflows |

## Review Rules

| Change Area | Required Review |
|---|---|
| Architecture or module boundaries | CTO or Principal Software Architect |
| Tenant isolation or data access | Security Architect and Database Architect |
| Auth, permissions, audit | Security Architect and Backend Lead |
| Frontend route boundaries or client-safe UI | Frontend Lead and Security Architect |
| DevOps, CI/CD, secrets, environments | DevOps Architect and Release Manager |
| QA evidence or test governance | QA Lead |
| Finance visibility or payment decisions | Finance Owner and Security Architect |
| AI provider, transcription, or AI permissions | AI Systems Architect and Security Architect |

## Review Requirements

| Requirement | Rule |
|---|---|
| ADR changes | Must be reviewed by owning role listed in architecture decision log |
| Standards changes | Must be reviewed by Principal Software Architect or relevant domain lead |
| Security-sensitive changes | Must be reviewed by Security Architect |
| QA evidence standards | Must be reviewed by QA Lead |
| DevOps standards | Must be reviewed by DevOps Architect and Release Manager |
| Day summary files | Must be reviewed by Technical Program Manager |

## Documentation Standards

| Standard | Requirement |
|---|---|
| ADR status | ADRs must include a clear `Status:` line |
| Day summaries | Sprint 0 day summaries must list files created, files modified, decisions, blockers, completion status, and next step |
| Decision updates | Decision tracker must be updated when a decision moves to Complete, Proposed, Assigned Forward, or Blocked |
| Tables | Use tables for decision and ownership matrices where practical |
| No implementation content | Sprint 0 setup docs must not include code, SQL, or migrations |

## Documentation Locations

| Artifact | Location |
|---|---|
| ADRs | `docs/adr` |
| Architecture decision log | `docs/adr/architecture-decision-log.md` |
| Repository standards | `docs/standards/repository-standard.md` |
| Sprint 0 decision tracker | `docs/sprint-0/decision-tracker.md` |
| Sprint 0 daily summaries | `docs/sprint-0` |
| QA evidence templates | `docs/qa` |
| Security standards | `docs/security` |
| Release and rollback standards | `docs/release` |

## Ownership Model

| Area | Owner Role |
|---|---|
| Repository structure | Principal Software Architect |
| Architecture decisions | CTO / Principal Software Architect |
| Delivery tracking | Technical Program Manager |
| Frontend standards | Frontend Lead |
| Backend standards | Backend Lead |
| Database and tenant data rules | Database Architect |
| Security, permissions, audit | Security Architect |
| QA evidence and validation | QA Lead |
| Deployment and operations | DevOps Architect |
| Release governance | Release Manager |
| Product scope and client value | Product Owner |

## Ownership Rules

| Rule | Requirement |
|---|---|
| Role ownership first | Sprint 0 artifacts assign owner roles, not named people |
| Named owners later | Named owners may be assigned inside Jira/Linear after import |
| Sensitive ownership | Security Architect is blocker authority for tenant, permission, audit, client boundary, finance, AI, and report safety |
| DevOps ownership | DevOps Architect is blocker authority for hosting, environments, CI/CD, secrets, and monitoring |
| QA ownership | QA Lead owns validation templates and evidence standards |

## Sprint 0 Setup Restriction

Sprint 0 setup work is limited to repository structure, standards, ADRs, decision tracking, QA/security/release baselines, and implementation readiness. It must not include production feature implementation for auth, tenant system, client portal, CRM, finance, AI, reports, automations, dashboards, or other product modules.

## Day 1 Repository Decision

| Decision | Result |
|---|---|
| Repository model | Monorepo |
| Architecture style | Modular monolith |
| Existing root app movement | Deferred, no Day 1 source movement |
| Sprint 1 readiness impact | Day 1 repository and architecture direction is complete |

## Day 2 Repository Standard Completion

| Decision | Result |
|---|---|
| Frontend boundary | Future MAOS frontend work targets `apps/web` |
| Backend boundary | Future MAOS backend work targets `apps/api` |
| Worker boundary | Future async work targets `apps/worker` |
| Current root app | Preserved in place; migration deferred |
| Branch/review policy | Documented |
| Protected branch policy | Documented for repository hosting setup |
| No feature work rule | Documented |
