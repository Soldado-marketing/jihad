# Sprint 11 MVP Regression Checklist

## Purpose

Validate that the full MVP surface from Sprint 1 through Sprint 10 remains stable before release candidate preparation.

## Regression Matrix

| Area | Required Checks | Evidence Required | Blocking Criteria | Status |
|---|---|---|---|---|
| Identity and tenant foundation | Tenant, user, membership, invite, session, device, and login history models exist; no public registration exists | API test output and QA evidence record | Missing identity model or public registration route | Ready |
| Permissions and audit | Permission guard remains deny-by-default; protected routes declare permissions; audit placeholders exist | API test output and audit marker review | Unguarded protected route or missing audit marker on sensitive flow | Ready |
| Projects and tasks | Project, task, subtask, assignment, tenantId, guarded routes, and audit placeholders remain present | API and web test output | Missing tenantId or route guard | Ready |
| Client portal | Client routes remain separate; client-safe payloads exclude internal notes, chat, finance details, audit logs, and other-client data | API and web test output | Internal data appears in client surface | Ready |
| CRM basic | Leads, opportunities, meetings, follow-ups, pipeline enum, guarded routes, and no client exposure | API and web test output | CRM exposed to client portal | Ready |
| Collaboration foundation | Internal notes remain internal-only; no realtime client chat is introduced here | API and web test output | Internal collaboration exposed to client portal | Ready |
| Files and approvals | File metadata, versions, signed URL placeholder, approval records, guards, and audit placeholders remain present | API and web test output | Signed URL path lacks permission marker or unsafe upload control appears | Ready |
| Chat and notifications | Internal/client channel separation, minimal realtime placeholder, session revocation placeholder, and notification scope remain present | API test output | Internal chat exposed to client portal or realtime payload is not minimal | Ready |
| Voice and AI safety | Transcription and AI extraction remain placeholder-only; human confirmation remains required | API and web test output | Real provider call or automatic task creation appears | Ready |
| Finance basic | Finance remains Owner-only; client invoice/payment placeholders remain client-safe | API and web test output | Manager, Employee, or Client gets owner finance surface | Ready |
| Dashboards and reports | Hidden count/total suppression remains present; reports remain basic and permission-filtered | API and web test output | Hidden total leakage or advanced BI feature appears | Ready |

## Required Evidence Records

| Evidence ID | Source | Required Result |
|---|---|---|
| S11-REG-API | `apps/api npm test` | Pass |
| S11-REG-WEB | `apps/web npm test` | Pass |
| S11-BUILD-API | `apps/api npm run build` | Pass |
| S11-BUILD-WEB | `apps/web npm run build` | Pass |
| S11-PRISMA | `apps/api npm run prisma:validate` | Pass |

## Exit Criteria

- All Sprint 1 through Sprint 10 baseline tests pass.
- Sprint 11 hardening tests pass.
- No deferred feature is accidentally introduced.
- No production integration is activated.
- Known issues are registered and non-blocking.
