# MAOS Architecture Decision Log

## Purpose

This log tracks Sprint 0 architecture decisions required before implementation begins. ADR-001 is approved on Sprint 0 Day 1. Remaining ADRs are listed with target days and owner roles for Day 2 through Day 5 execution.

| ADR ID | Title | Owner Role | Status | Target Day | Dependency | Notes |
|---|---|---|---|---|---|---|
| ADR-001 | Architecture style: modular monolith | CTO / Principal Software Architect | Approved | Day 1 | Master Specification / Phase 14 | Approved for MVP monorepo and modular monolith |
| ADR-002 | Frontend stack | Frontend Lead | Approved | Day 2 | Approved stack direction | Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui or equivalent approved; root Next.js app remains unmoved |
| ADR-003 | Backend stack | Backend Lead | Approved | Day 2 | Approved stack direction | NestJS, Node.js, TypeScript, and REST-first baseline approved |
| ADR-004 | Database and tenant isolation strategy | Database Architect / Security Architect | Approved | Day 3 | ORM choice and tenant hardening decision | PostgreSQL shared database MVP approach, tenant_id, tenant-aware repositories, and targeted RLS/equivalent baseline approved |
| ADR-005 | ORM/data access strategy | Database Architect / Principal Software Architect | Approved | Day 3 | PostgreSQL and tenant hardening baseline | PostgreSQL plus Prisma or equivalent approved with tenant-aware repository wrapper and service-level scope validation |
| ADR-006 | API style: REST-first | Backend Lead | Approved | Day 3 | Backend stack ADR | REST-first API style, DTO validation, safe errors, pagination/filtering/sorting, and client API boundary approved |
| ADR-007 | File storage strategy | DevOps Architect / Backend Lead | Proposed | Day 5 | Object storage decision | S3-compatible storage, signed URL, versioning, client visibility, and future malware scan baseline documented; provider assigned to Sprint 6 |
| ADR-008 | Realtime strategy | Principal Software Architect / DevOps Architect | Proposed | Day 5 | Realtime provider approach | WebSocket/managed realtime options, channel authorization, session revocation, and internal/client separation documented; provider assigned to Sprint 7 |
| ADR-009 | Queue/jobs strategy | Backend Lead / DevOps Architect | Proposed | Day 5 | Environment and CI/CD decisions | Redis/BullMQ or equivalent baseline, tenant/actor context, retries, dead-letter, and permission revalidation documented |
| ADR-010 | AI/transcription provider strategy | AI Systems Architect / Security Architect | Proposed | Day 5 | AI and transcription provider shortlist | AI provider abstraction, multilingual benchmarks, retention/security, no unauthorized training, and human approval documented; providers assigned to Sprint 8 |
| ADR-011 | Hosting platform and deployment direction | CTO / DevOps Architect | Proposed | Day 2 / Day 4 | Hosting platform and region baseline | Docker-capable managed hosting direction proposed; environment/secrets/monitoring compatibility documented; final provider and region remain assigned Day 5 risk |
| ADR-012 | Observability and monitoring strategy | DevOps Architect | Approved | Day 4 | Monitoring/logging baseline | Provider-neutral monitoring/logging baseline approved; final provider can be assigned forward with owner and gate |
| ADR-013 | Backup and recovery strategy | DevOps Architect / Database Architect | Approved | Day 5 | PostgreSQL and storage direction | Backup/restore baseline approved with RPO/RTO placeholders and launch readiness gate |
| ADR-014 | Security baseline and audit strategy | Security Architect | Approved | Day 4 | Tenant hardening baseline | Invite-only, RBAC/custom permission foundation, permission guard, service scope validation, audit logging, and audit redaction baseline approved |
| ADR-015 | Hotfix and rollback strategy | Release Manager / CTO | Approved | Day 5 | Release governance | Hotfix classification, approval owners, minimum tests, rollback triggers, post-hotfix audit, and communication expectations approved |

## Status Definitions

| Status | Meaning |
|---|---|
| Approved | Decision is accepted and can guide implementation |
| Planned | Decision is scheduled but not yet approved |
| Blocked | Decision cannot proceed because a dependency is missing |
| Deferred | Decision is intentionally assigned forward with owner, risk, artifact, and later gate |
| Proposed | Direction is documented but final approval depends on a later Sprint 0 gate |

## Decision Log Progress

| Item | Result |
|---|---|
| ADR-001 | Approved |
| Day 1 architecture direction | Complete |
| ADR-002 | Approved |
| ADR-003 | Approved |
| ADR-004 | Approved |
| ADR-005 | Approved |
| ADR-006 | Approved |
| ADR-011 | Proposed with Day 4 hosting capability baseline, environment strategy, secrets compatibility, monitoring compatibility, and region assigned risk documented |
| ADR-012 | Approved |
| ADR-014 | Approved |
| Day 4A security/devops baselines | Complete |
| Day 4B frontend/UX/API/QA readiness | Complete |
| ADR-007 | Proposed and assigned to Sprint 6 file implementation gate |
| ADR-008 | Proposed and assigned to Sprint 7 realtime/chat gate |
| ADR-009 | Proposed and assigned before first worker-backed feature |
| ADR-010 | Proposed and assigned to Sprint 8 voice/AI gate |
| ADR-013 | Approved |
| ADR-015 | Approved |
| Sprint 1 readiness | Go |
