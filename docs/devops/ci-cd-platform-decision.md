# MAOS CI/CD Platform Decision

Status: Approved

## Context

MAOS requires CI/CD gates before Sprint 1 implementation work can safely proceed. The repository is not currently initialized as a git repository in this workspace, and a final hosting platform remains proposed. CI/CD platform selection should align with repository hosting and deployment decisions.

## CI/CD Options

| Option | Fit | Notes |
|---|---|---|
| GitHub Actions | Strong default if repository is hosted on GitHub | Common, flexible, good ecosystem |
| GitLab CI | Strong if repository is hosted on GitLab | Integrated with GitLab |
| Provider-native CI | Useful if hosting provider has strong CI/CD | May increase provider coupling |
| External CI service | Possible later | Adds setup overhead |

## Recommended Baseline

Use GitHub Actions if the repository is hosted on GitHub. Otherwise use the CI system native to the selected repository host. CI/CD must support build, typecheck, lint, tests, security checks, deployment gates, and rollback/hotfix workflows.

## Build/Test/Security/Deploy Gates

| Gate | Requirement |
|---|---|
| Build | Required before merge/deploy once implementation begins |
| Typecheck | Required for TypeScript code |
| Lint | Required for frontend/backend code |
| Tests | Required as test suites are created |
| Security scan | Required before production deployment |
| Deployment gate | Required before staging/production deployment |
| Rollback gate | Required before production release readiness |

## Dependency On Hosting/Repository

The CI/CD baseline is approved for Sprint 1 readiness. The default is GitHub Actions when the repository is hosted on GitHub; otherwise use the native CI/CD system of the selected repository host. Final provider-specific workflow files are not created in Sprint 0.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| CI/CD options are documented | Met |
| Recommended baseline is documented | Met |
| Build/test/security/deploy gates are documented | Met |
| Dependencies are documented | Met |
| No CI/CD implementation was created | Met |

## Open Questions

| Question | Owner Role | Target |
|---|---|---|
| Confirm repository hosting provider | CTO / Technical Program Manager | Before shared remote repository execution |
| Confirm final CI/CD platform implementation | DevOps Architect / Release Manager | Before CI workflow creation |
| Confirm required checks for protected branch | CTO / DevOps Architect / QA Lead | Before protected branch enforcement |
