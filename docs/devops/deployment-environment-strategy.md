# MAOS Deployment And Environment Strategy

## Purpose

Define the Sprint 0 environment baseline for MAOS MVP.

## Environment Matrix

| Environment | Purpose | Data Rules | Access Rules |
|---|---|---|---|
| Local | Developer setup and isolated testing | No production data; fake/sandbox data only | Individual developers |
| Dev | Shared early integration if needed | Seed/test data only | Development team |
| QA | QA execution and evidence capture | Controlled test tenants and users | QA, developers, security as needed |
| Staging | Production-like release validation | Sanitized or synthetic production-like data only | Release, QA, security, product |
| UAT | User acceptance testing | Controlled pilot test data | Approved UAT participants |
| Production | Live tenant use | Live data only | Restricted operational access |
| Demo/Sandbox | Sales/training/pilot-safe demos | Demo data only | Approved operators |

## Refresh And Reset Expectations

| Environment | Rule |
|---|---|
| Local/dev | Can reset freely with seed/test data |
| QA | Reset must preserve test evidence references where required |
| Staging/UAT | Reset requires QA/Release Manager coordination |
| Production | No reset except approved incident/disaster recovery procedure |

## Deployment Region Baseline Or Assigned Risk

The MVP should prefer an EU region because the current operating context is Europe/Berlin and the platform supports European users. Final production region remains an assigned Day 5 risk until the hosting provider, data residency, latency, and payment/AI provider constraints are confirmed.

| Item | Baseline |
|---|---|
| Preferred region | EU-first where provider support allows |
| Risk owner | DevOps Architect / Owner |
| Gate | Finalized before production launch |
| Sprint 1 impact | Not blocking if local/QA/staging strategy and secrets/CI baseline are approved |

## Environment Promotion

Promotion path is local/dev to QA to staging/UAT to production. Production promotion requires CI/CD gate success, release approval, rollback readiness, and audit-sensitive validation where relevant.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Local/dev/QA/staging/UAT/production environments are documented | Met |
| Demo/sandbox expectation is documented | Met |
| Data rules per environment are documented | Met |
| Access rules are documented | Met |
| Refresh/reset rules are documented | Met |
| Deployment region baseline or assigned risk is documented | Met |
