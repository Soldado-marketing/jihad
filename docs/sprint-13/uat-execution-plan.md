# UAT Execution Plan

## Purpose

Prepare UAT execution evidence for MAOS MVP production launch readiness.

## Evidence Location Recommendation

Store UAT evidence under a release-controlled location such as:

- `docs/sprint-13/uat-evidence/` for non-sensitive text references.
- External secure evidence storage for screenshots/logs that contain user, tenant, or client data.

Do not commit sensitive screenshots, tokens, secrets, or personal data.

## UAT Scenarios

| Scenario ID | Scenario | Role | Who Should Test | Required Evidence | Pass/Fail |
|---|---|---|---|---|---|
| UAT-001 | Invite-only access | Owner/Manager/Employee/Client | QA Lead with Product Owner observer | Invite acceptance screenshot/log reference and no-public-registration evidence | Pending |
| UAT-002 | Owner dashboard | Owner | Product Owner / QA Lead | Dashboard screenshot and Owner role evidence | Pending |
| UAT-003 | Manager reports | Manager | QA Lead | Report page screenshot and owner finance suppression evidence | Pending |
| UAT-004 | Client portal | Client | Product Owner / QA Lead | Client portal screenshot and internal navigation absence evidence | Pending |
| UAT-005 | Projects/tasks | Owner | QA Lead | Project/task screenshots and tenant scope evidence | Pending |
| UAT-006 | CRM | Manager | Product Owner / QA Lead | CRM screenshots and client portal absence evidence | Pending |
| UAT-007 | Collaboration/chat | Employee | QA Lead | Internal collaboration/chat placeholder screenshots | Pending |
| UAT-008 | Files/approvals | Owner | QA Lead | File/version/approval screenshots and signed URL notice | Pending |
| UAT-009 | Voice-to-task draft | Owner | QA Lead / Security Architect | Human confirmation and AI placeholder evidence | Pending |
| UAT-010 | Client invoice/payment | Client | Product Owner / QA Lead | Client invoice/payment screenshots and cost/payroll absence evidence | Pending |

## Required Screenshot/Log References

Each scenario must capture:

- Environment URL.
- Tested build/version.
- User role.
- Tenant/client/project scope.
- Expected result.
- Actual result.
- Permission result.
- Screenshot or log reference.
- Defect link if failed.
- Reviewer signoff.

## Blocker Escalation

| Finding | Severity | Escalation |
|---|---|---|
| Tenant leakage | Critical | CTO, Security Architect, QA Lead |
| Client data leakage | Critical | CTO, Security Architect, Product Owner |
| Owner finance leakage | Critical | CTO, Security Architect, Finance Owner |
| Hidden report totals leaked | Critical | CTO, Security Architect, QA Lead |
| Public registration appears | High | CTO, Security Architect, Product Owner |
| Core journey broken | High | Release Manager, QA Lead, owning lead |
| Placeholder confusion | Low/Medium | Product Owner for scope communication |

## UAT Readiness Status

Status: Ready to execute after staging/UAT environment, accounts, and test data are prepared. Evidence is not yet captured.
