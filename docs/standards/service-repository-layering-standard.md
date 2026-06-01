# MAOS Service/Repository Layering Standard

## Purpose

Define how controllers, services, repositories, guards, workers, reports, AI, and future automations must interact to prevent tenant isolation and permission drift.

## Controller Responsibilities

| Responsibility | Requirement |
|---|---|
| Request handling | Parse request context and pass to guards/services |
| Validation handoff | Use DTO validation before service execution |
| No persistence access | Controllers must not directly query tenant-owned persistence |
| Error handling | Return safe errors without hidden metadata leakage |

## Service Responsibilities

| Responsibility | Requirement |
|---|---|
| Business rules | Own module business behavior |
| Resource scope | Validate tenant, client, project, task, file, finance, report, and audit scope |
| Permission re-check | Re-check sensitive scope beyond route-level guard |
| Audit intent | Prepare or call audit events for sensitive actions |

## Repository Responsibilities

| Responsibility | Requirement |
|---|---|
| Persistence | Own tenant-aware read/write methods |
| Tenant context | Require tenant context for tenant-owned records |
| Unscoped queries | Not allowed for tenant-owned records |
| Sensitive tables | Follow hardening and audit requirements |

## Tenant Context Requirement

Tenant context must be provided to services and repositories for tenant-owned data access. Absence of tenant context must fail closed.

## Permission Guard Requirement

Protected routes require server-side permission guards. Guards are necessary but not sufficient for sensitive operations; services must validate resource scope.

## Service-Level Resource Scope Validation

Sensitive operations must validate whether the actor can access the specific resource in the given tenant and client/project/task/file/finance/report scope.

## Worker/Job Access Rule

Workers must call the same service paths used by API execution for sensitive operations and must preserve tenant/actor context.

## Reports/AI/Automation Cannot Bypass Permission Engine

Reports, AI retrieval, AI actions, background jobs, and future automations must use permission-safe service/query paths. They must not query hidden data directly.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Controller responsibilities are documented | Met |
| Service responsibilities are documented | Met |
| Repository responsibilities are documented | Met |
| Tenant context requirement is documented | Met |
| Permission guard requirement is documented | Met |
| Service-level scope validation is documented | Met |
| Worker/job access rule is documented | Met |
| Reports/AI/automation bypass prevention is documented | Met |
