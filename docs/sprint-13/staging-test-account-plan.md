# Staging Test Account Plan

## Purpose

Define required staging/UAT test accounts for UAT evidence and 50-user load readiness.

## Account Rules

- All accounts must be invite-only.
- Public registration must remain unavailable.
- Accounts must use staging/UAT test tenants only.
- No production user data may be used.
- Evidence is required after each account is created.

## Test Accounts

| Account ID | Role | Tenant Association | Required Scope | Evidence Required |
|---|---|---|---|---|
| ACC-OWNER-001 | Owner | Tenant A | Finance, dashboard, reports, project/task, admin paths | Invite record, login/session evidence, Owner role verification |
| ACC-MANAGER-001 | Manager | Tenant A | CRM, reports without Owner-only finance, collaboration | Invite record, role verification, denied finance evidence |
| ACC-EMPLOYEE-001 | Employee | Tenant A | Projects/tasks, collaboration, chat, voice placeholders | Invite record, role verification, denied Owner-only paths |
| ACC-CLIENT-001 | Client | Tenant A client scope | Client dashboard, client projects/tasks, client invoices/payments | Invite record, client scope evidence, internal navigation absence |
| ACC-OWNER-002 | Owner | Tenant B | Tenant isolation control | Invite record, cross-tenant denial evidence |
| ACC-CLIENT-002 | Client | Tenant B client scope | Tenant/client isolation control | Invite record, cross-client denial evidence |

## Test Data Associations

| Data Area | Required Association |
|---|---|
| Projects/tasks | Tenant A and Tenant B records to validate isolation |
| Client portal | Client records scoped to assigned tenant/client only |
| CRM | Internal-only Tenant A data |
| Files/approvals | Tenant-scoped metadata and client-visible placeholder where safe |
| Chat/notifications | Internal channel data and separated client-safe placeholder if used |
| Voice | Internal voice note and draft placeholder |
| Finance | Owner-only Tenant A finance data and client-safe invoice/payment placeholder |
| Reports | Report placeholder data with hidden total suppression |

## Invite-Only Requirement

| Check | Expected Result | Blocks Launch |
|---|---|---:|
| Public registration route | Absent | Yes |
| Invite acceptance path | Available for approved test accounts | Yes |
| Account creation without invite | Denied | Yes |
| Client account internal navigation | Not visible | Yes |

## Evidence Required After Creation

- Invite request record.
- Invite acceptance evidence.
- Role and tenant membership verification.
- Login/session evidence.
- Client scope evidence for client accounts.
- Cross-tenant denial evidence.

## Current Status

Status: Planned. Test accounts are not confirmed created in this workspace.
