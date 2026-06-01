# ADR-015: Hotfix And Rollback Strategy

Status: Approved

## Context

MAOS cannot launch without a hotfix and rollback baseline. Sprint 1 also needs release governance so implementation changes do not bypass security, QA, and review controls.

## Decision

Approve the MVP hotfix and rollback baseline. Production release later requires rollback readiness, minimum tests, approval owners, audit references, and communication expectations.

## Hotfix Classification

| Class | Definition | Default Urgency |
|---|---|---|
| Security hotfix | Fixes access, tenant isolation, secrets, audit, or leakage issue | Critical |
| Production outage hotfix | Restores unavailable core service | Critical |
| Finance/client data hotfix | Fixes financial or client-visible data issue | High/Critical |
| Functional hotfix | Fixes blocked critical workflow | High |
| Cosmetic hotfix | Fixes non-blocking UI issue | Medium/Low |

## Approval Owners

| Hotfix Type | Required Approval |
|---|---|
| Security | CTO, Security Architect, Release Manager |
| Finance | CTO, Finance Owner, Security Architect, Release Manager |
| Client portal | CTO, Product Owner, Security Architect, Release Manager |
| AI | CTO, AI Systems Architect, Security Architect, Release Manager |
| General | CTO or Release Manager depending severity |

## Minimum Tests

Minimum tests include targeted functional test, regression check for impacted module, permission/security test where relevant, audit/log validation for sensitive changes, and rollback verification.

## Rollback Triggers

Rollback is triggered by tenant isolation failure, unauthorized access, audit failure, severe production outage, data corruption, payment/finance exposure, client data leakage, or failed critical health checks after deployment.

## Post-Hotfix Audit

Every hotfix requires a post-hotfix audit note with issue link, root cause summary, approvals, tests run, deployment time, rollback status, and follow-up actions.

## Communication Expectations

Security, finance, client-facing, or outage hotfixes require owner-approved internal communication. Client communication is required if client-visible impact occurred.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Hotfix classification is documented | Met |
| Approval owners are documented | Met |
| Minimum tests are documented | Met |
| Rollback triggers are documented | Met |
| Post-hotfix audit is documented | Met |
| Communication expectations are documented | Met |
