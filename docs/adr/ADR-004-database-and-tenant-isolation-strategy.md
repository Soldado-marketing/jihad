# ADR-004: Database and Tenant Isolation Strategy

Status: Approved

## Context

MAOS is a multi-tenant SaaS platform with invite-only access, internal workspace, client portal, projects, CRM, files, chat, voice notes, finance, AI, reporting, and future automations. The MVP must support rapid delivery while enforcing tenant isolation, client boundaries, Owner-only finance visibility, permission-safe reporting, and auditability.

The approved technical direction uses a modular monolith with PostgreSQL as the database baseline. Day 3 defines the tenant isolation baseline required before Sprint 1 identity and tenant implementation begins.

## Decision

MAOS will use a shared PostgreSQL database for MVP with strict tenant-scoped application access, tenant-aware repository wrappers, mandatory `tenant_id` on tenant-owned tables, targeted RLS or equivalent database-level hardening for sensitive table groups where practical, and service-level resource scope validation for sensitive operations.

## PostgreSQL Baseline

| Area | Decision |
|---|---|
| Primary database | PostgreSQL |
| MVP isolation model | Shared database with strict tenant-scoped access |
| Data access pattern | Tenant-aware repositories called through services |
| Sensitive hardening | Targeted RLS or equivalent protection for sensitive table groups where practical |
| Migration governance | Required before schema implementation |
| Audit readiness | Sensitive operations must be audit-ready |

## Shared Database MVP Approach

The MVP uses a shared database because it is operationally simpler, faster to deliver, and consistent with the modular monolith approach. This is acceptable only if all tenant-owned records are tenant-scoped and protected by repository, service, permission, and test standards.

## tenant_id Requirement

| Rule | Requirement |
|---|---|
| Tenant-owned tables | Must include `tenant_id` unless explicitly approved as an exception |
| Cross-tenant records | Must be denied by default |
| Query access | Tenant-owned queries require tenant context |
| Relationship consistency | Child records must remain consistent with the tenant of parent records |
| Exceptions | Must be documented with owner, reason, compensating control, and test coverage |

## Targeted RLS or Equivalent Protection Baseline

| Control | Baseline |
|---|---|
| MVP requirement | Evaluate targeted RLS or equivalent database-level protection for sensitive table groups |
| Minimum allowed control | Tenant-aware repository plus service scope validation plus permission tests |
| Sensitive groups | Must have documented hardening target before implementation |
| Later enterprise path | Broaden RLS or isolated tenant storage where scale/compliance requires |

## Sensitive Table Groups

| Table Group | Hardening Expectation |
|---|---|
| Audit logs | Append-only, tenant-scoped, Owner/security-grant access only |
| Sessions/devices/login history | Tenant/user-scoped, sensitive access logged |
| Permission grants | Tenant-scoped, security-reviewed changes |
| Files/file versions/file shares | Tenant-scoped, permission check before file access or signed URL |
| Chat messages | Tenant/channel/client boundary scoped |
| Voice notes/transcripts | Tenant/project/task/client scoped |
| AI logs and AI suggestions | Tenant-scoped, redacted where required |
| Finance/invoices/payments/revenue | Tenant-scoped and Owner-only by default |
| Report access logs | Tenant-scoped and redacted for sensitive reports |
| Automation run logs | Tenant-scoped with execution context preserved |

## Tenant-Aware Repositories

Tenant-aware repositories are mandatory for tenant-owned data access. Repositories must require tenant context, reject unscoped tenant-owned queries, and avoid direct use by controllers.

## Service-Level Scope Validation Expectations

Services must validate tenant, role, permission, client, project, task, file, finance, report, and audit scope for sensitive operations. Permission guards are necessary but not sufficient for sensitive actions.

## Background Jobs Tenant Context Expectations

Background jobs must preserve tenant context and actor/effective actor context where applicable. Sensitive jobs must revalidate permissions before execution.

## Reporting/AI/Automation Tenant Context Expectations

| Area | Requirement |
|---|---|
| Reporting | Must use permission-safe query services and suppress hidden counts/totals |
| AI | Must retrieve only permission-filtered tenant-scoped data |
| Automations | Must execute within approved tenant and actor context |

## Risks

| Risk | Mitigation |
|---|---|
| Application-only tenant filtering fails | Tenant-aware repositories, service validation, tests, and targeted RLS evaluation |
| Sensitive data leakage through reports | Permission-safe report query layer and hidden count/total suppression |
| Jobs lose tenant context | Job payload standards and permission revalidation |
| Developer bypasses repository | Review standards and later automated checks |
| RLS not fully implemented in MVP | Document targeted hardening and require explicit compensating controls |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| PostgreSQL baseline is documented | Met |
| Shared database MVP approach is documented | Met |
| `tenant_id` requirement is documented | Met |
| Targeted RLS/equivalent baseline is documented | Met |
| Sensitive table groups are identified | Met |
| Tenant-aware repositories are required | Met |
| Service-level scope validation is required | Met |
| Background job tenant context expectations are documented | Met |
| Reporting, AI, and automation tenant context expectations are documented | Met |
| No SQL or migrations were created | Met |

## Open Questions

| Question | Owner Role | Target |
|---|---|---|
| Exact RLS implementation scope for MVP sensitive tables | Database Architect / Security Architect | Before schema implementation |
| Final migration governance process | Database Architect / Release Manager | Day 4 |
