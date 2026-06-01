# Sprint 11 UAT Checklist

## Purpose

Prepare MVP user acceptance testing without adding new scope.

## UAT Roles

| Role | UAT Focus |
|---|---|
| Owner | Workspace dashboard, projects/tasks, CRM, files, approvals, chat, voice, finance, reports |
| Manager | Workspace dashboard, projects/tasks, CRM, collaboration, files, approvals, chat, voice, reports without owner finance |
| Employee | Assigned workspace areas, projects/tasks, collaboration, files, approvals, chat, voice, no finance or reports if not allowed |
| Client | Client dashboard, client projects/tasks, client invoices/payments only |

## UAT Scenarios

| Scenario ID | Scenario | Role | Expected Result | Blocking Criteria |
|---|---|---|---|---|
| UAT-001 | User signs in through invite-only baseline | Owner/Manager/Employee/Client | Account access is invite-based only | Public registration appears |
| UAT-002 | Owner reviews workspace dashboard | Owner | Owner sees MVP summaries and owner finance placeholder | Hidden totals leak to non-owner |
| UAT-003 | Manager reviews reports | Manager | Manager sees safe reports without owner-only finance | Manager sees owner finance summary |
| UAT-004 | Client opens client portal | Client | Client sees client-safe home, projects, tasks, invoices, payments | Internal navigation appears |
| UAT-005 | Owner reviews projects and tasks | Owner | Project/task pages and placeholders are available | Tenant or permission marker missing |
| UAT-006 | Manager reviews CRM | Manager | CRM pages are available internally only | CRM appears in client portal |
| UAT-007 | Employee reviews collaboration and chat | Employee | Internal collaboration/chat placeholders are available | Client chat or external realtime is active |
| UAT-008 | Owner reviews file and approval placeholders | Owner | File versioning, signed URL notice, approval decision placeholder are visible | Unsafe upload or storage integration appears |
| UAT-009 | Owner reviews voice-to-task draft flow | Owner | Voice-to-task remains draft-only with human confirmation | Task is auto-created |
| UAT-010 | Client reviews invoice/payment placeholders | Client | Client sees invoice/payment placeholders only | Costs, payroll, profit, audit logs, or employee data appear |

## UAT Evidence

Each UAT scenario must capture environment, role, tenant, account type, expected result, actual result, screenshots/log references, pass/fail, reviewer, and timestamp.

## Exit Criteria

- All critical UAT scenarios pass.
- Any non-critical issue is listed in the known issues register.
- No UAT feedback adds Sprint 11 scope without change control.
