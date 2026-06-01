# ADR-006: REST-First API Style

Status: Approved

## Context

MAOS MVP needs clear API contracts between the web frontend, backend, and future worker/reporting/AI surfaces. The MVP scope does not require GraphQL. A REST-first API is simpler to validate, document, secure, and test for tenant isolation and permission boundaries.

## Decision

MAOS will use a REST-first API style for the MVP. API endpoints must be resource-oriented, DTO-validated, tenant-aware, permission-guarded, and safe against hidden metadata leakage.

## REST-First API Strategy

| Area | Decision |
|---|---|
| API style | REST-first |
| GraphQL | Not part of MVP unless later justified |
| API boundary | `apps/api` |
| Contract sharing | `packages/types` when implementation contracts are created |
| Validation | DTO validation required for write operations |
| Security | Server-side permission enforcement required |

## Resource Naming Rules

| Rule | Requirement |
|---|---|
| Nouns over verbs | Use resource-oriented naming where practical |
| Tenant scope | Tenant context must be resolved server-side, not trusted from client input |
| Client portal paths | Must remain separate from internal workspace paths |
| Sensitive actions | Use explicit action endpoints only when resource update semantics are insufficient |

## DTO Validation Expectations

| Area | Requirement |
|---|---|
| Request body | Validate type, required fields, enum values, length, and empty/null behavior |
| Path params | Validate IDs and allowed formats |
| Query params | Validate pagination, filtering, sorting, and search inputs |
| Sensitive inputs | Never log secrets, full payment details, file content, or sensitive AI prompt content |

## Error Model

| Error Type | Expected Behavior |
|---|---|
| Validation error | Return safe field-level validation details |
| Unauthorized | Return authentication-required response |
| Forbidden | Return safe access-denied response |
| Not found | Avoid revealing whether hidden resources exist |
| Server error | Return generic safe error and log internally with redaction |

## Pagination, Filtering, and Sorting Expectations

| Area | Requirement |
|---|---|
| Pagination | Required for list endpoints |
| Filtering | Must be tenant-scoped and permission-safe |
| Sorting | Must allow approved sortable fields only |
| Hidden data | Must not reveal hidden counts, hidden totals, or cross-client aggregates |

## Client Portal API Boundary Expectations

Client portal APIs must only return client-owned, client-visible, approved data. They must exclude internal notes, internal chat, employee costs, payroll, audit logs, hidden files, hidden reports, and other-client data.

## Hidden Metadata Leakage Prevention

APIs must avoid exposing hidden resource existence, unauthorized counts, internal IDs that reveal scope, hidden totals, internal usernames, internal comments, or financial/payroll data to unauthorized users.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| REST-first strategy is documented | Met |
| Resource naming rules are documented | Met |
| DTO validation expectations are documented | Met |
| Error model is documented | Met |
| Pagination/filtering/sorting expectations are documented | Met |
| Client portal API boundary expectations are documented | Met |
| Hidden metadata leakage prevention is documented | Met |
| No API implementation was added | Met |
