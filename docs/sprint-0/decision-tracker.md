# MAOS Sprint 0 Decision Tracker

## Purpose

This tracker controls Sprint 0 decisions and prevents Sprint 1 from starting with missing repository, tenant, auth, permission, audit, QA, CI/CD, secrets, invite-only, or release-governance standards.

## Tracking Rules

| Rule | Requirement |
|---|---|
| Daily review | Blocking decisions are reviewed every Sprint 0 day |
| Same-day escalation | Missed blocking decisions escalate the same day |
| Sprint 1 protection | Sprint 1 cannot start with missing tenant/auth/permission/audit/QA/CI/CD/secrets standards |
| Non-blocking decisions | Must still have owner role, deadline, risk, and artifact before Sprint 0 closes |
| Conditional Go | Forbidden for missing tenant isolation, auth/session/device, permission guard, service scope validation, audit redaction, QA evidence, Sprint 1 test plan, repository structure, CI/CD, secrets, invite-only, or invite testing path |

## Decision Tracker

| Decision ID | Decision | Owner Role | Target Day | Blocking Status | Required Artifact | Risk If Missed | Escalation Trigger | Current Status |
|---|---|---|---|---|---|---|---|---|
| D-001 | Hosting platform | CTO / DevOps Architect | Day 2 | Blocking | Hosting ADR | Environment and CI/CD planning drift | Not closed by Day 2 | Assigned Forward |
| D-002 | Repository structure | Principal Software Architect | Day 1 | Blocking | Repository standard | All setup tasks lack structure | Not closed by Day 1 | Complete |
| D-003 | Monorepo vs multi-repo | CTO / Principal Software Architect | Day 1 | Blocking | Repository ADR | Fragmented standards and tooling | Not closed by Day 1 | Complete |
| D-004 | ORM choice | Database Architect / Principal Software Architect | Day 2 | Blocking | ORM ADR | Tenant-aware repository baseline delayed | Not closed by Day 2 | Complete |
| D-005 | PostgreSQL environment strategy | Database Architect / DevOps Architect | Day 3 | Blocking | PostgreSQL environment plan | Sprint 1 data foundation delayed | Not closed by Day 3 | Complete |
| D-006 | Tenant hardening/RLS baseline | Database Architect / Security Architect | Day 3 | Blocking | Tenant isolation baseline | Tenant leakage risk | Not closed by Day 3 | Complete |
| D-007 | Realtime provider approach | Principal Software Architect / DevOps Architect | Day 5 | Non-blocking | Realtime decision note | Future chat/realtime ambiguity | No owner/deadline/gate by Day 5A | Assigned Forward |
| D-008 | Object storage provider | DevOps Architect / Security Architect | Day 5 | Non-blocking | Object storage decision note | Future file work blocked | No owner/deadline/gate by Day 5A | Assigned Forward |
| D-009 | Email provider | DevOps Architect / Product Operations | Day 3 | Blocking | Email provider note or invite fallback | Invite flow cannot be tested | No provider or fallback by Day 3 | Complete With Fallback |
| D-010 | Monitoring/logging provider | DevOps Architect | Day 4 | Blocking | Observability ADR | Sprint 1 failures not visible | Not closed by Day 4 | Complete |
| D-011 | Backup/restore process | DevOps Architect / Database Architect | Day 5 | Plan required | Backup/restore plan | Recovery planning remains vague | No backup/restore plan by Day 5A | Complete |
| D-012 | CI/CD platform/baseline | DevOps Architect / Release Manager | Day 3-Day 4 | Blocking | CI/CD baseline plan | Quality gates cannot run | Not closed by Day 4 | Complete |
| D-013 | Secrets management | DevOps Architect / Security Architect | Day 4 | Blocking | Secrets management plan | Secret leakage or unsafe configs | Not closed by Day 4 | Complete |
| D-014 | Deployment region | DevOps Architect / Owner | Day 4 | Assignment required | Region note | Compliance and latency ambiguity | Region decision unowned | Assigned Forward |
| D-015 | Payment provider shortlist | Finance Owner / CTO | Day 5 | Non-blocking | Payment shortlist note | Sprint 9 finance uncertainty | No payment shortlist owner | Assigned Forward |
| D-016 | AI provider shortlist | AI Systems Architect / Security Architect | Day 5 | Non-blocking | AI provider shortlist | Sprint 8 AI security uncertainty | No AI provider owner | Assigned Forward |
| D-017 | Transcription provider shortlist | AI Systems Architect | Day 5 | Non-blocking | Transcription shortlist | Voice-to-task quality risk unowned | No transcription benchmark plan | Assigned Forward |
| D-018 | Report export MVP decision | Product Owner / Security Architect | Day 5 | Non-blocking | Report export decision note | Report export scope creep or privacy risk | Export decision missing | Assigned Forward |
| D-019 | Hotfix path | Release Manager / CTO | Day 5 | Blocking | Hotfix/rollback baseline | Unsafe production fix process | Not closed by Day 5 | Complete |

## Day 1 Completed Decisions

| Decision ID | Result |
|---|---|
| D-002 | Repository structure uses MAOS MVP monorepo directories |
| D-003 | Monorepo selected over multi-repo for MVP |
| ADR-001 | Modular monolith architecture approved |
| DOC-001 | Architecture decision log created |
| R0-001 | Sprint 0 decision tracking process confirmed |

## Day 2 Completed And Proposed Decisions

| Decision ID | Result | Current Status |
|---|---|---|
| D-001 | Docker-capable managed hosting direction documented in ADR-011; final provider remains open for Day 4 | Proposed |
| D-004 | PostgreSQL plus Prisma or equivalent direction approved in ADR-005 after Day 3 tenant/database baseline | Complete |
| ADR-002 | Frontend stack approved as Next.js, React, TypeScript, Tailwind CSS, shadcn/ui or equivalent | Complete |
| ADR-003 | Backend stack approved as NestJS, Node.js, TypeScript, REST-first | Complete |
| TECH-001 | Modular monolith module boundary map created | Complete |
| TECH-006 | Branch and review standards strengthened in repository standard | Complete |
| DOC-002 | Repository standard completed for Day 2 | Complete |
| FE-001 | Frontend setup standard created | Complete |
| FE-002 | React/TypeScript baseline documented | Complete |
| BE-001 | Backend setup standard created | Complete |

## Day 3 Completed And Proposed Decisions

| Decision ID | Result | Current Status |
|---|---|---|
| D-004 | PostgreSQL plus Prisma or equivalent approved with tenant-aware repository wrapper | Complete |
| D-005 | PostgreSQL environment strategy documented | Complete |
| D-006 | Tenant hardening/RLS-equivalent baseline documented | Complete |
| D-009 | Email provider path remains proposed; invite testing fallback documented for Sprint 1 safety | Proposed |
| D-012 | CI/CD baseline documented as proposed; superseded by Day 4 provider-neutral CI/CD baseline plan | Complete |
| ADR-004 | Database and tenant isolation strategy approved | Complete |
| ADR-005 | ORM/data access strategy approved | Complete |
| ADR-006 | REST-first API style approved | Complete |
| SEC-001 | Invite-only access standard created | Complete |
| QA-001 | MVP QA strategy created | Complete |
| QA-002 | QA evidence template created | Complete |
| DB-001 | PostgreSQL environment strategy created | Complete |
| DB-003 | Tenant-aware repository baseline created | Complete |
| DB-004 | tenant_id policy created | Complete |
| TECH-002 | Service/repository layering standard created | Complete |
| TECH-003 | Tenant context propagation standard created | Complete |
| TECH-005 | API contract standard created | Complete |
| BE-004 | DTO validation standard created | Complete |
| DEVOPS-001 | Docker local environment plan created | Complete |
| TECH-008 | Documentation structure created | Complete |

## Day 4A Completed And Proposed Decisions

| Decision ID | Result | Current Status |
|---|---|---|
| D-001 | Hosting capability baseline updated; final provider remains proposed and assigned to Day 5A/provider gate | Proposed |
| D-010 | Observability and monitoring baseline approved in ADR-012 and monitoring/logging baseline | Complete |
| D-013 | Secrets management plan created and accepted as Sprint 1 baseline | Complete |
| D-014 | EU-first deployment region preference documented; final region assigned risk before production | Assigned Risk |
| ADR-011 | Hosting platform ADR updated with Day 4 environment, monitoring, secrets, and region notes | Proposed |
| ADR-012 | Observability and monitoring strategy approved | Complete |
| ADR-014 | Security baseline and audit strategy approved | Complete |
| SEC-003 | Permission guard standard created | Complete |
| SEC-004 | Service-level resource scope validation reinforced through security ADR and permission guard standard | Complete |
| SEC-005 | Audit logging baseline created | Complete |
| SEC-006 | Audit redaction checklist created | Complete |
| DB-005 | Sensitive-table hardening plan created | Complete |
| DB-006 | Migration governance plan created | Complete |
| DEVOPS-002 | Deployment and environment strategy created | Complete |
| DEVOPS-003 | Deployable services plan created | Complete |
| DEVOPS-004 | CI/CD baseline plan created | Complete |

## Day 4B Completed Decisions

| Decision ID | Result | Current Status |
|---|---|---|
| FE-003 | Frontend environment config standard created | Complete |
| FE-004 | Route group structure documented | Complete |
| FE-005 | Role-aware navigation standard created | Complete |
| UX-001 | RTL/LTR baseline created | Complete |
| UX-002 | Accessibility baseline created | Complete |
| QA-003 | Sprint 1 test plan created | Complete |
| QA-004 | Permission test matrix created | Complete |
| QA-005 | Tenant isolation test plan created | Complete |
| BE-005 | Backend setup standard strengthened for Sprint 1A/1B readiness | Complete |
| FE-006 | Frontend setup standard strengthened for Day 4B readiness | Complete |

## Remaining Day 4 Assigned-Forward Items

| Decision ID | Reason | Owner Role | Next Gate |
|---|---|---|---|
| D-001 | Final hosting provider is not selected yet; hosting capability baseline is sufficient for Sprint 1 planning | CTO / DevOps Architect | Day 5A classification or before environment execution |
| D-014 | Deployment region depends on final provider, data residency, and future production constraints | DevOps Architect / Owner | Day 5A classification; final before production |
| D-009 | Email provider remains proposed, but invite testing fallback protects Sprint 1 | DevOps Architect / Product Operations | Day 5B Go/No-Go requires provider path or fallback |

## Day 5A Assigned-Forward Decisions

| Decision ID | Result | Current Status | Later Gate |
|---|---|---|---|
| D-001 | Final hosting provider remains assigned forward; hosting capability baseline is enough for Sprint 1 local implementation | Assigned Forward | Before shared environment execution |
| D-007 | Realtime provider options and authorization baseline documented | Assigned Forward | Sprint 7 |
| D-008 | Object storage options and S3-compatible default documented | Assigned Forward | Sprint 6 |
| D-011 | Backup/restore plan and ADR-013 approved | Complete | Restore drill before production launch |
| D-014 | EU-first deployment region preference assigned forward | Assigned Forward | Before production |
| D-015 | Payment provider shortlist and manual fallback documented | Assigned Forward | Sprint 9 |
| D-016 | AI provider shortlist and provider abstraction documented | Assigned Forward | Sprint 8 |
| D-017 | Transcription provider shortlist and multilingual benchmark documented | Assigned Forward | Sprint 8 |
| D-018 | Report export MVP decision documented as limited/deferred | Assigned Forward | Sprint 10 |
| ADR-007 | File storage strategy documented | Proposed | Sprint 6 |
| ADR-008 | Realtime strategy documented | Proposed | Sprint 7 |
| ADR-009 | Queue/jobs strategy documented | Proposed | Before first worker-backed feature |
| ADR-010 | AI/transcription provider strategy documented | Proposed | Sprint 8 |
| ADR-013 | Backup and recovery strategy approved | Complete | Production launch readiness |
| DEVOPS-005 | Frontend error tracking note documented | Assigned Forward | Sprint 2 frontend shell or before production monitoring |
| SEC-007 | Signed URL security note documented | Assigned Forward | Sprint 6 |
| SEC-008 | Realtime authorization note documented | Assigned Forward | Sprint 7 |

## Day 5B Go/No-Go Decisions

| Gate | Result | Current Status |
|---|---|---|
| Repository standard gate | Pass | Go |
| Hosting/CI/CD/secrets gate | Pass with provider assigned forward | Go |
| Tenant isolation gate | Pass | Go |
| Auth/session/device gate | Pass | Go |
| RBAC and permission gate | Pass | Go |
| Audit logging and redaction gate | Pass | Go |
| QA evidence and Sprint 1 test gate | Pass | Go |
| Email provider or invite fallback gate | Pass with approved fallback | Go |
| Hotfix and rollback gate | Pass | Go |
| Sprint 1 readiness decision | Go | Go |
