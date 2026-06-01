# Sprint 12 Release Candidate Checklist

## Purpose

Define the stabilization gates required before MAOS MVP can move from Sprint 12 release candidate work to Sprint 13 launch preparation.

## Release Candidate Gates

| Gate | Required Evidence | Owner Role | Blocking Criteria | Status |
|---|---|---|---|---|
| RC scope lock | Sprint 1-10 MVP scope only; no new product scope | Product Owner | New feature added without change control | Ready |
| Build validation | API and web builds pass | Release Manager | Failed build | Ready |
| Test validation | API and web tests pass | QA Lead | Failed test suite | Ready |
| Prisma validation | Prisma schema validates | Database Architect | Invalid schema | Ready |
| Migration readiness | Production migration note completed; no unguided migrations | Database Architect | Missing migration governance | Ready |
| Environment readiness | Local/QA/staging/UAT/production readiness criteria documented | DevOps Architect | Missing environment owner or gate | Ready |
| Deployment readiness | Deployment, secrets, monitoring, and rollback gates documented | DevOps Architect | Missing deployment or rollback gate | Ready |
| Backup/restore readiness | Backup/restore note completed with RPO/RTO placeholders | DevOps Architect | Missing restore drill expectation | Ready |
| Security sign-off | Tenant, permission, client, finance, AI, report, audit gates ready | Security Architect | Failed critical security gate | Ready |
| UAT readiness | UAT scenarios and evidence template ready | QA Lead | Missing UAT evidence path | Ready |
| Known issue disposition | No open Critical/High issues; Low issues accepted or gated | Technical Program Manager | Critical/High issue open | Ready |
| Performance readiness | 50 concurrent user readiness review completed or accepted risk | CTO / DevOps Architect | Missing review or accepted risk | Ready |

## Sprint 13 Launch Constraint

Sprint 13 cannot proceed to launch unless the 50-concurrent-user load readiness review is completed or explicitly accepted as a controlled risk by CTO, DevOps Architect, QA Lead, and Product Owner.

## Exit Criteria

- Every RC gate is Ready, Passed, or explicitly accepted as controlled risk.
- No Critical or High release blocker is open.
- No production migration is executed outside migration governance.
- No deferred feature is activated.
