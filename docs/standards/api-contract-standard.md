# MAOS API Contract Standard

## Purpose

Define REST API contract standards for MAOS MVP without implementing endpoints.

## REST Resource Naming

| Rule | Requirement |
|---|---|
| Resource-oriented paths | Prefer resource nouns and clear hierarchy |
| Tenant resolution | Tenant context is resolved server-side |
| Client portal separation | Client portal APIs must be separately scoped |
| Sensitive actions | Use explicit action semantics only when needed |

## DTO Validation

All write requests require DTO validation for type, required fields, enums, IDs, null/empty behavior, and approved query parameters.

## Error Response Model

| Error | Behavior |
|---|---|
| Validation | Safe field-level validation message |
| Unauthorized | Authentication required |
| Forbidden | Access denied without hidden resource detail |
| Not found | Avoid revealing unauthorized resource existence |
| Server error | Generic response, redacted internal log |

## Pagination

List endpoints must support pagination once implemented. Pagination metadata must not expose hidden counts to unauthorized users.

## Filtering

Filters must be tenant-scoped, permission-safe, and validated against approved filter fields.

## Sorting

Sorting must allow only approved sortable fields and must not reveal hidden metadata.

## Permission-Denied Behavior

Permission-denied responses must be safe, consistent, and non-revealing. Sensitive denied attempts should be audit-ready.

## Not-Found vs Forbidden Leakage Prevention

When a resource exists but is hidden from the actor, the API must avoid confirming hidden existence. Behavior must be standardized by resource sensitivity.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| REST resource naming is documented | Met |
| DTO validation is documented | Met |
| Error response model is documented | Met |
| Pagination expectations are documented | Met |
| Filtering expectations are documented | Met |
| Sorting expectations are documented | Met |
| Permission-denied behavior is documented | Met |
| Not-found vs forbidden leakage prevention is documented | Met |
