# MAOS Sprint 1 Test Plan

## Purpose

Define the initial QA plan for Sprint 1 identity, tenants, permissions, sessions, devices, login history, and audit foundation.

## Test Areas

| Area | Required Tests |
|---|---|
| Invite-only | Valid invite acceptance, expired invite denial, revoked invite denial, duplicate invite handling |
| No public registration | Public signup route absent or denied; uninvited account creation denied |
| Session basics | Login, logout, expiry, invalid session denial |
| Device/login history | Device record creation, login history creation, user-safe visibility |
| RBAC | Owner, Manager, Employee, Client baseline allowed/denied checks |
| Permission guard | Protected route denial, allowed route access, safe forbidden/not-found behavior |
| Audit | Sensitive allowed/denied events create redacted audit evidence |
| Tenant isolation | Same-role cross-tenant denial and tenant context propagation |

## Evidence Requirements

Each test must capture role, tenant, client/project scope if applicable, expected result, actual result, permission result, screenshots/log references, and pass/fail result using `docs/qa/qa-evidence-template.md`.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Invite-only tests are documented | Met |
| No-public-registration tests are documented | Met |
| Session basics tests are documented | Met |
| Device/login history tests are documented | Met |
| RBAC tests are documented | Met |
| Permission guard tests are documented | Met |
| Audit tests are documented | Met |
| Tenant isolation tests are documented | Met |
| Evidence requirements are documented | Met |
