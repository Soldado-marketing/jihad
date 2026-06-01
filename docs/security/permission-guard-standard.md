# MAOS Permission Guard Standard

## Purpose

Define how protected routes and sensitive operations must be guarded in Sprint 1 and later implementation.

## Route Guard Expectations

| Rule | Requirement |
|---|---|
| Protected routes | Must require authenticated session and tenant context |
| Role checks | Must evaluate role before route handler execution |
| Permission checks | Must evaluate required permission/action before service execution |
| Client routes | Must validate client membership and client-visible scope |
| Sensitive modules | Must prepare audit event metadata for permission result |

## Role Checks

| Role | Default Scope |
|---|---|
| Owner | Full tenant scope except platform operations outside MVP |
| Manager | Assigned/granted operational scope |
| Employee | Own/assigned work scope |
| Client | Own client-visible data only |

## Permission Checks

Permission checks must include action, resource type, tenant context, actor context, role, explicit grants, and relevant client/project/task scope.

## Resource Scope Checks

Route guards perform coarse checks. Services must perform resource-specific scope validation before returning or mutating sensitive data.

## Service-Level Validation

Services must validate:

- Tenant ownership.
- Resource membership/assignment.
- Client visibility flags.
- Financial/payroll grant requirements.
- File/chat/voice/report visibility.
- Audit logging requirement for sensitive results.

## Denied Behavior

Denied responses must not reveal hidden counts, hidden totals, tenant existence, client existence, or resource existence where the actor lacks access.

## Audit Expectation

Sensitive allowed and denied actions must be audit-ready. Denied sensitive attempts should include actor, tenant, action, resource type, permission result, outcome, timestamp, and safe failure category.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Route guard expectations are documented | Met |
| Role checks are documented | Met |
| Permission checks are documented | Met |
| Resource scope checks are documented | Met |
| Service-level validation is documented | Met |
| Denied behavior is documented | Met |
| Audit expectation is documented | Met |
