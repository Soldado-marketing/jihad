# ADR-005: ORM/Data Access Strategy

Status: Approved

## Context

MAOS requires PostgreSQL, tenant isolation, permission-safe data access, auditability, client boundary enforcement, Owner-only financial visibility, report query safety, and AI retrieval safety. Day 3 confirms the database and tenant isolation baseline, making the ORM/data access direction sufficient for approval.

The existing root application remains unmoved and is not migrated during Sprint 0.

## Decision

MAOS will use PostgreSQL plus Prisma or an equivalent TypeScript ORM for MVP data access. The ORM must be wrapped by tenant-aware repositories and service-level scope validation. Controllers must not access persistence directly.

## PostgreSQL and ORM Baseline

| Area | Decision |
|---|---|
| Database | PostgreSQL |
| ORM | Prisma or equivalent TypeScript ORM |
| Data access boundary | Tenant-aware repository wrapper |
| Business logic boundary | Services own business rules and scope validation |
| Direct controller data access | Not allowed |
| Sensitive operations | Require service-level resource scope validation |
| Workers/reports/AI | Must use permission-safe service/repository paths |

## Tenant-Aware Repository Wrapper

| Rule | Requirement |
|---|---|
| Tenant context required | Tenant-owned repository methods require tenant context |
| No unscoped tenant queries | Repository APIs must not expose unscoped tenant-owned reads/writes |
| Sensitive tables | Must follow targeted hardening baseline and permission checks |
| Client scope | Client portal data must be own-client-only and client-visible |
| Finance scope | Finance records are Owner-only by default |
| Audit readiness | Sensitive writes must be audit-ready |

## Service/Repository Layering

| Layer | Responsibility |
|---|---|
| Controller/API route | Request parsing and guard handoff |
| Guard | Authentication and high-level permission check |
| Service | Business rules, tenant/resource scope, audit intent |
| Repository | Tenant-aware persistence |
| Worker | Async execution through service paths |
| Report/AI access | Permission-filtered data retrieval only |

## No Direct Data Access From Controllers

Controllers and route handlers must call services. They must not directly use ORM clients for tenant-owned or sensitive data.

## Sensitive Operations Require Service-Level Scope Validation

Sensitive operations include identity, tenant membership, permission changes, client portal visibility, files, chat, voice, AI, finance, reports, and future automations. These operations require guard-level authorization plus service-level scope validation.

## Risks

| Risk | Mitigation |
|---|---|
| ORM used directly and bypasses tenant wrapper | Repository standard, review rules, and later automated checks |
| Tenant context omitted | Repository method signatures and tests require context |
| Report queries expose hidden totals | Reports must use permission-safe query layer |
| RLS scope unclear | ADR-004 requires targeted RLS/equivalent baseline and future implementation decision |
| Migration drift | Migration governance required before database implementation |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| PostgreSQL plus Prisma or equivalent is approved | Met |
| Tenant-aware repository wrapper is required | Met |
| Service/repository layering is documented | Met |
| Controllers cannot directly access tenant-owned persistence | Met |
| Sensitive operations require service-level scope validation | Met |
| Risks are documented | Met |
| No ORM package was installed | Met |
| No SQL or migrations were created | Met |
