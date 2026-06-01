# MAOS MVP QA Strategy

## Purpose

Define MVP QA scope and evidence expectations before Sprint 1 begins.

## Functional QA

Functional QA validates expected workflows for identity, projects, tasks, client portal, CRM, collaboration, files, voice, finance, reports, and later modules as they enter MVP scope.

## Permission QA

Permission QA validates Owner, Manager, Employee, and Client allowed/denied behavior, including own/assigned scope and explicit grant behavior where applicable.

## Tenant Isolation QA

Tenant isolation QA validates cross-tenant denial across lists, details, search, files, reports, AI retrieval, jobs, and audit-visible events.

## Security QA

Security QA validates invite-only access, no public registration, session/device expectations, sensitive actions, audit readiness, and safe error behavior.

## Client Visibility QA

Client visibility QA validates that clients see only own-client and client-visible data, excluding internal notes, internal chat, costs, payroll, audit logs, and hidden reports.

## Finance QA

Finance QA validates Owner-only visibility, client own invoice/payment visibility, and audit readiness for sensitive financial actions.

## AI QA

AI QA validates permission-filtered retrieval, prompt injection controls, human approval, source references where possible, and no hidden data leakage.

## Reporting QA

Reporting QA validates permission-safe reports, hidden count suppression, hidden total suppression, client-safe reporting, export gates, and audit readiness.

## Regression Cadence

| Sprint Type | Regression Requirement |
|---|---|
| Identity/permissions sprint | Auth, session, RBAC, audit regression |
| Project/task sprint | Resource scope regression |
| Client portal sprint | Client visibility regression |
| File/approval sprint | File permission and signed URL regression |
| AI sprint | Prompt injection, permission, and human approval regression |
| Finance sprint | Owner-only and client invoice/payment regression |
| Reports sprint | Hidden count/total suppression regression |

## Evidence Expectations

QA evidence must include test case ID, tester, environment, role, tenant, client/project scope, expected result, actual result, permission result, log/screenshot references, pass/fail, reviewer, and timestamp.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Functional QA is documented | Met |
| Permission QA is documented | Met |
| Tenant isolation QA is documented | Met |
| Security QA is documented | Met |
| Client visibility QA is documented | Met |
| Finance QA is documented | Met |
| AI QA is documented | Met |
| Reporting QA is documented | Met |
| Regression cadence is documented | Met |
| Evidence expectations are documented | Met |
