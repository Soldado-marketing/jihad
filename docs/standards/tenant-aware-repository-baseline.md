# MAOS Tenant-Aware Repository Baseline

## Purpose

Define repository expectations for tenant-owned data access without implementing repositories.

## Tenant Context Required

Repository methods for tenant-owned records must require tenant context. Missing tenant context must fail closed.

## Repository Method Conventions

| Convention | Requirement |
|---|---|
| Tenant-scoped methods | Include tenant context in method contract |
| Sensitive methods | Require service-level scope validation before use |
| List methods | Apply tenant and permission-safe filters |
| Create/update methods | Preserve tenant consistency with parent records |
| Delete/archive methods | Require explicit permission and audit readiness |

## Tenant-Owned Query Rules

Tenant-owned reads and writes must include tenant scope. Cross-tenant access must be denied by default.

## No Unscoped Tenant Queries

Unscoped tenant-owned queries are not allowed in API, services, workers, reports, AI retrieval, or future automations.

## Sensitive Table Expectations

Sensitive table groups require hardening targets, permission checks, audit readiness, and tests before implementation.

## Testing Requirements

| Test | Requirement |
|---|---|
| Tenant A cannot read Tenant B | Required |
| Tenant A cannot update Tenant B | Required |
| Client cannot access other-client data | Required |
| Reports cannot reveal hidden counts/totals | Required |
| AI cannot retrieve hidden data | Required |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Tenant context requirement is documented | Met |
| Repository method conventions are documented | Met |
| Tenant-owned query rules are documented | Met |
| No unscoped tenant queries rule is documented | Met |
| Sensitive table expectations are documented | Met |
| Testing requirements are documented | Met |
