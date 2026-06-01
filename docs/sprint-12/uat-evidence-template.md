# Sprint 12 UAT Evidence Template

## Purpose

Capture manual UAT evidence for Sprint 12 release candidate validation.

## Evidence Record

| Field | Required | Description |
|---|---:|---|
| UAT Evidence ID | Yes | Unique UAT evidence reference |
| Scenario ID | Yes | Linked scenario from Sprint 11 UAT checklist |
| Test date | Yes | Date of execution |
| Environment | Yes | QA, staging, or UAT |
| Tested build | Yes | RC version or commit/reference |
| Tester | Yes | Tester name or role |
| Reviewer | Yes | Reviewer role |
| User role | Yes | Owner, Manager, Employee, or Client |
| Tenant | Yes | Tenant used for test |
| Scope | Yes | Client, project, task, finance, report, or module scope |
| Preconditions | Yes | Required setup before execution |
| Steps executed | Yes | Short execution notes |
| Expected result | Yes | Expected behavior |
| Actual result | Yes | Observed behavior |
| Permission result | Yes | Allowed, denied, suppressed, or redacted |
| Screenshots/log references | Yes | Evidence links or file references |
| Defect or known issue link | Conditional | Required if failed or accepted |
| Pass/fail | Yes | Final test result |
| Sign-off | Yes | Reviewer sign-off |

## Required UAT Evidence Scope

- Owner core workspace and finance path.
- Manager workspace/report path without owner-only finance.
- Employee allowed workspace path without finance/report leakage.
- Client portal path with client-safe project/task/invoice/payment views only.

## Exit Criteria

- All critical UAT scenarios pass.
- Failed non-critical scenarios are linked to known issues.
- UAT feedback does not add new scope without change control.
