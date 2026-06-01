# MAOS tenant_id Policy

## Purpose

Define when `tenant_id` is required and how tenant relationship consistency must be preserved.

## Tenant-Owned Table Definition

A table is tenant-owned when its records belong to a tenant, tenant member, client, project, task, file, chat, voice note, AI log, financial record, report, audit record, or future automation within a tenant.

## When tenant_id Is Mandatory

| Table Type | tenant_id Requirement |
|---|---|
| Tenant-owned operational data | Mandatory |
| User membership data | Mandatory where membership is tenant-scoped |
| Client/project/task data | Mandatory |
| Files/chat/voice/AI data | Mandatory |
| Finance/report/audit data | Mandatory where tenant-scoped |
| Global lookup data | May be omitted if non-sensitive and explicitly global |

## Approved Exceptions

Exceptions require owner, reason, compensating control, relationship rule, and test coverage. Exceptions must be documented before schema implementation.

## Relationship Consistency Expectations

Child records must match the tenant of parent records. Cross-tenant parent/child relationships are forbidden unless explicitly designed as global non-sensitive references.

## Migration Review Expectation

Future schema changes must be reviewed for tenant_id presence, foreign key tenant consistency, indexes, sensitive table classification, RLS/equivalent target, and rollback approach.

## Test Expectation

Tests must verify tenant scoping, cross-tenant denial, relationship consistency, and exception controls.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Tenant-owned table definition is documented | Met |
| tenant_id mandatory rules are documented | Met |
| Approved exceptions are documented | Met |
| Relationship consistency expectations are documented | Met |
| Migration review expectation is documented | Met |
| Test expectation is documented | Met |
