# MAOS Hotfix And Rollback Baseline

## Purpose

Define the release governance baseline for hotfixes and rollbacks.

## Hotfix Classes

| Class | Description | Approval |
|---|---|---|
| Security | Tenant isolation, permission, secrets, audit, or data leakage issue | CTO + Security Architect + Release Manager |
| Finance/client data | Financial or client-visible data issue | CTO + Finance Owner/Product Owner + Security Architect + Release Manager |
| Production outage | Core service unavailable | CTO + DevOps Architect + Release Manager |
| Critical functional | Critical MVP workflow blocked | Product Owner + CTO + Release Manager |
| Minor hotfix | Non-critical issue | Release Manager with Product Owner approval |

## Minimum Test Requirements

| Hotfix Type | Minimum Test |
|---|---|
| Security | Targeted security regression and audit validation |
| Finance/client data | Owner/client visibility test and audit validation |
| Outage | Health check and smoke test |
| Functional | Targeted functional and regression check |
| Minor | Targeted verification |

## Rollback Requirement

Every production hotfix must have rollback path, rollback trigger, owner, and communication plan before deployment.

## Audit Requirement

Hotfix approval, deployment, rollback decision, and post-hotfix review must be audit-recorded or release-recorded.

## Communication Requirement

Internal stakeholders must be notified for critical hotfixes. Client notification is required for client-visible impact.

## Known Issue Link

Known issues accepted into a release must reference owner, severity, expiry/review date, and mitigation.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Hotfix classes are documented | Met |
| Approval owners are documented | Met |
| Minimum test requirements are documented | Met |
| Rollback requirement is documented | Met |
| Audit requirement is documented | Met |
| Communication requirement is documented | Met |
| Known issue link requirement is documented | Met |
