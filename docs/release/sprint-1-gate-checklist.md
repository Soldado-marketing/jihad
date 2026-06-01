# MAOS Sprint 1 Gate Checklist

## Purpose

Track the Sprint 1 start gates approved at Sprint 0 closure.

## Gate Checklist

| Gate | Required Evidence | Result |
|---|---|---|
| Repository | ADR-001, repository standard, module boundary map | Pass |
| Hosting/CI/CD/secrets | ADR-011, CI/CD baseline, CI/CD platform decision, secrets plan | Pass |
| Tenant isolation | ADR-004, tenant isolation baseline, tenant_id policy, tenant-aware repository baseline | Pass |
| Auth/session/device | Invite-only standard, backend setup standard, Sprint 1 test plan | Pass |
| RBAC/permissions | ADR-014, permission guard standard, permission test matrix | Pass |
| Audit/redaction | Audit logging baseline, audit redaction checklist, ADR-014 | Pass |
| QA evidence/test plan | QA evidence template, Sprint 1 test plan, tenant isolation test plan | Pass |
| Email provider/invite fallback | Approved invite testing fallback | Pass |
| Hotfix/rollback | ADR-015, hotfix/rollback baseline | Pass |

## Sprint 1 Start Rule

Sprint 1 can start only for identity, tenant, permission, session, device, login history, and audit foundation work. Client portal, finance, AI, reports, automations, and dashboards remain out of Sprint 1 scope.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| All Sprint 1 gates are listed | Met |
| Evidence is mapped to each gate | Met |
| Sprint 1 scope restriction is documented | Met |
| No production feature implementation is included | Met |
