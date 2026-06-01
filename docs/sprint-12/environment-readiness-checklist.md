# Sprint 12 Environment Readiness Checklist

## Purpose

Confirm that release candidate environments have clear readiness expectations.

| Environment | Required Readiness | Owner Role | Blocking Criteria | Status |
|---|---|---|---|---|
| Local | API/web build and tests run locally | Engineering Leads | Local validation cannot run | Ready |
| QA | QA test data, tenant data, and evidence capture path defined | QA Lead | QA evidence cannot be captured | Ready |
| Staging | Deployment target, secrets path, monitoring path, and rollback path defined | DevOps Architect | No staging deployment path | Ready |
| UAT | UAT roles, test tenant, evidence template, and reviewer process defined | QA Lead / Product Owner | UAT cannot execute | Ready |
| Production | Launch requires migration, backup, monitoring, rollback, and performance gate closure | Release Manager | Any launch gate missing | Not launched |

## Data Rules

- No production data in local/dev.
- UAT/staging data must be synthetic or approved test data.
- Client-visible UAT data must not include real confidential data unless approved.

## Exit Criteria

- Every pre-production environment has owner and evidence path.
- Production remains locked until Sprint 13 launch gates pass.
