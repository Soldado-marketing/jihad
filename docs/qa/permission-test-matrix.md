# MAOS Permission Test Matrix

## Purpose

Define baseline role permission tests for Sprint 1.

## Role Baseline

| Role | Expected Allowed Baseline | Expected Denied Baseline |
|---|---|---|
| Owner | Tenant administration, invitations, role management, audit access as permitted | Cross-tenant access, platform-superadmin operations outside MVP |
| Manager | Assigned/granted operational records | Global finance, payroll, unrelated clients/projects, audit logs |
| Employee | Own/assigned work records | Global data, unrelated projects, finance, payroll, audit logs |
| Client | Own client-visible records | Internal workspace, internal chat, employee costs, payroll, audit logs, other clients |

## Resource Scope Expectations

| Scope | Test Expectation |
|---|---|
| Tenant | Actor cannot access another tenant's resources |
| Client | Client user sees only own client-visible data |
| Project | Manager/employee access depends on assignment or explicit grant |
| Finance | Owner-only by default |
| Audit | Owner/security-grant only |

## Negative Tests

| Negative Test | Expected Result |
|---|---|
| Employee attempts Owner route | Denied safely |
| Client attempts internal route | Denied safely |
| Manager attempts unrelated project | Denied safely |
| User attempts cross-tenant ID | Denied without metadata leakage |
| Unauthorized actor attempts audit access | Denied and logged where sensitive |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Owner allowed/denied baseline is documented | Met |
| Manager allowed/denied baseline is documented | Met |
| Employee allowed/denied baseline is documented | Met |
| Client allowed/denied baseline is documented | Met |
| Resource scope expectations are documented | Met |
| Negative tests are documented | Met |
