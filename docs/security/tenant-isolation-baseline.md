# MAOS Tenant Isolation Baseline

## Purpose

Define the tenant isolation baseline required before Sprint 1 identity, tenant, permission, and audit implementation begins.

## Tenant Resolution Model

| Context | Resolution Rule |
|---|---|
| HTTP request | Tenant context is resolved after authentication and membership validation |
| Client portal request | Tenant and client scope are resolved together |
| Background job | Tenant context must be part of job payload or retrievable from a safe job reference |
| Report request | Tenant context and permission scope must be resolved before query execution |
| AI retrieval | Tenant and permission-filtered scope must be resolved before retrieval |
| Audit event | Tenant context must be captured on sensitive events where available |

## tenant_id Policy Summary

Tenant-owned records must include `tenant_id` unless a documented exception exists. Tenant-owned access must require tenant context at repository level and resource scope validation at service level for sensitive operations.

## Tenant-Owned Table Rule

| Rule | Requirement |
|---|---|
| Tenant-owned data | Requires `tenant_id` |
| Shared lookup data | May omit `tenant_id` if global and non-sensitive |
| Cross-tenant joins | Must preserve tenant consistency |
| Exceptions | Require owner, reason, compensating control, and tests |

## Sensitive Table Hardening

Sensitive table groups require hardening targets beyond normal application filters, including audit logs, sessions/devices, permission grants, files, chat, voice, AI logs, finance, reports, and future automation logs.

## Targeted RLS/Equivalent Control Baseline

| Control | Requirement |
|---|---|
| Targeted RLS evaluation | Required for sensitive table groups where practical |
| Equivalent controls | Tenant-aware repositories, service validation, permission tests, audit events |
| Final scope | Must be confirmed before schema implementation |

## Cross-Tenant Denial Expectation

Any attempt by Tenant A to access Tenant B data must be denied without revealing hidden metadata. This includes lists, detail pages, search, reports, files, chat, AI retrieval, background jobs, and future automations.

## Required Tests

| Test | Requirement |
|---|---|
| Cross-tenant list denial | Tenant A cannot list Tenant B records |
| Cross-tenant detail denial | Tenant A cannot fetch Tenant B record by ID |
| Client boundary denial | Client cannot access other-client data |
| Report leakage denial | Hidden counts/totals are suppressed |
| AI retrieval denial | AI cannot retrieve hidden tenant/client data |
| Job context validation | Jobs preserve and validate tenant context |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Tenant resolution model is documented | Met |
| tenant_id policy summary is documented | Met |
| Tenant-owned table rule is documented | Met |
| Sensitive table hardening is documented | Met |
| Targeted RLS/equivalent baseline is documented | Met |
| Cross-tenant denial expectation is documented | Met |
| Required tests are documented | Met |
