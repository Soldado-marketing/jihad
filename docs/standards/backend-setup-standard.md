# MAOS Backend Setup Standard

## Purpose

This standard defines the approved backend setup expectations for MAOS MVP. It is a Sprint 0 setup document only and does not implement backend features.

## NestJS Module Structure

| Area | Standard |
|---|---|
| API boundary | `apps/api` |
| Worker boundary | `apps/worker` |
| Framework | NestJS |
| Language | TypeScript |
| Module style | Domain modules inside modular monolith |
| Shared contracts | `packages/types` when API contracts are defined |

Expected backend module groups include identity, tenants, permissions, audit, projects, tasks, client portal, CRM, collaboration, files, voice, AI, finance, and reporting.

## Backend Module Map

The backend module map is governed by `docs/standards/module-boundary-map.md`. Backend modules must follow that boundary map and must not create direct cross-module persistence access.

## REST-First API Conventions

| Rule | Requirement |
|---|---|
| API style | REST-first |
| Resource orientation | Endpoint paths should represent resources and actions clearly |
| Versioning | Versioning approach to be finalized in ADR-006 |
| Pagination | Required for list endpoints once implementation begins |
| Filtering | Must be tenant-scoped and permission-safe |
| Error responses | Must avoid hidden metadata leakage |

API conventions are governed by `docs/standards/api-contract-standard.md` and ADR-006.

## DTO Validation Baseline

| Rule | Requirement |
|---|---|
| Write requests | DTO validation required before service execution |
| Invalid input | Must return safe validation errors |
| Sensitive input | Must avoid logging secrets, payment details, file content, or sensitive AI prompts |
| QA testability | Validation rules must be testable by QA |

DTO validation details are governed by `docs/standards/dto-validation-standard.md`.

## Service Layer Expectations

| Rule | Requirement |
|---|---|
| Controllers | Controllers never access persistence directly |
| Services | Services own business rules and resource scope validation |
| Context | Services receive tenant context and actor context for protected operations |
| Sensitive actions | Sensitive services must prepare audit events |
| Client portal | Services must enforce client-visible and own-client-only rules |
| Finance | Services must enforce Owner-only finance visibility by default |

## Repository Layer Expectations

| Rule | Requirement |
|---|---|
| Tenant context | Required for tenant-owned records |
| Direct bypass | Direct data access outside repositories is not allowed for protected modules |
| Sensitive tables | Must follow sensitive-table hardening baseline once defined |
| Reporting | Report queries must use permission-safe query services |
| AI retrieval | AI must retrieve only permission-filtered data |

## Permission Guard Placeholder

Sprint 1 will define and implement the initial permission guard. Day 2 records the placeholder requirement:

- Route-level permission guard required for protected API routes.
- Service-level scope validation required for sensitive operations.
- Background workers must not bypass permission paths.

## Tenant Resolver Placeholder

Sprint 1 will define and implement the initial tenant resolver. Day 2 records the placeholder requirement:

- Tenant context must be available for protected API requests.
- Tenant context must propagate to services, repositories, jobs, reports, and AI retrieval.
- Cross-tenant access must be denied by default.

## Audit Service Placeholder

Sprint 1 will define and implement the audit service baseline after ADR-014. Day 2 records the placeholder requirement:

- Sensitive actions must be audit-ready.
- Audit records must include actor, tenant, resource, action, permission result, outcome, timestamp, and session/device where available.
- Sensitive payloads must be redacted.

## Day 4A Sprint 1A/1B Backend Readiness

| Sprint Slice | Backend Readiness Requirement |
|---|---|
| Sprint 1A Identity Foundation | Auth module skeleton, tenant resolver skeleton, invite-only route boundary, session basics boundary, login history boundary |
| Sprint 1B Permissions And Audit Foundation | Permission guard skeleton, resource scope validation pattern, audit service skeleton, audit redaction baseline |

## Auth Module Skeleton Scope

The auth module skeleton may be created in Sprint 1 only after invite-only, no-public-registration, session, device, and audit expectations are accepted. It must not include public registration.

## Permission Guard Skeleton

The permission guard skeleton must support role checks, permission checks, tenant context, resource scope metadata, denied behavior, and audit-ready permission results.

## Tenant Resolver Skeleton

The tenant resolver skeleton must create tenant context before protected service execution and must propagate context to service and repository layers.

## Audit Service Skeleton

The audit service skeleton must support append-only event creation, redaction hooks, actor/tenant/resource/action/outcome fields, permission result, and session/device context where available.

## Sprint 1 Backend Exit Readiness

| Criterion | Requirement |
|---|---|
| Tenant resolver | Standard documented and ready for implementation |
| Permission guard | Standard documented and ready for implementation |
| Audit service | Baseline and redaction documented |
| Sensitive data | Sensitive-table hardening and migration governance documented |
| QA | Sprint 1 test plan and permission/tenant tests documented |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| NestJS backend boundary is documented | Met |
| REST-first conventions are documented | Met |
| DTO validation baseline is documented | Met |
| Service layer expectations are documented | Met |
| Repository layer expectations are documented | Met |
| Permission guard placeholder is documented | Met |
| Tenant resolver placeholder is documented | Met |
| Audit service placeholder is documented | Met |
| No backend feature implementation was added | Met |
| Backend module map link is documented | Met |
| API convention links are documented | Met |
| DTO validation standard link is documented | Met |
| Sprint 1A/1B backend readiness is documented | Met |
| Auth module skeleton scope is documented | Met |
| Permission guard skeleton is documented | Met |
| Tenant resolver skeleton is documented | Met |
| Audit service skeleton is documented | Met |
