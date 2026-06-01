# MAOS CI/CD Baseline Plan

## Purpose

Define the minimum CI/CD gates required before Sprint 1 implementation work starts.

## Build Gate

| Requirement | Baseline |
|---|---|
| Web | Build must pass for active frontend app path |
| API | Build must pass once API scaffold exists |
| Worker | Build must pass once worker scaffold exists |
| Shared packages | Build/type checks must pass once packages contain code |

## Type/Lint Gate

Type checking and linting must run for changed workspaces once tooling exists. Sprint 0 does not install tooling or implement code; it defines the gate requirement.

## Test Gate

| Test Type | Baseline |
|---|---|
| Unit | Required once feature code exists |
| Permission | Required for protected APIs and sensitive modules |
| Tenant isolation | Required for tenant-owned data access |
| Client visibility | Required before client portal features |
| Finance | Required before finance features |

## Security Scan Gate

Security scanning should include dependency vulnerability scanning, secret scanning, and static checks where practical. Secret scanning is a Sprint 1 protection gate.

## Deploy Gate

Deployments to shared environments require successful checks, approved environment secrets, and environment-specific configuration.

## Rollback Gate

Production deployment cannot be approved without rollback baseline from Day 5.

## Environment Promotion

Promotion path: local/dev to QA to staging/UAT to production. Production requires release approval and rollback readiness.

## Pull Request Checks

Pull requests must include build/type/lint/test/security checks as they become available, plus review requirements from the repository standard.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Build gate is documented | Met |
| Type/lint gate is documented | Met |
| Test gate is documented | Met |
| Security scan gate is documented | Met |
| Deploy gate is documented | Met |
| Rollback gate dependency is documented | Met |
| Pull request check expectations are documented | Met |
