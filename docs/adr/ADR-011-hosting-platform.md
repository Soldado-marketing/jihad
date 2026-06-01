# ADR-011: Hosting Platform

Status: Proposed

## Context

MAOS requires a Docker-capable MVP deployment path with staging and production support. The platform must support a web application, API application, worker process, PostgreSQL, object storage integration, secrets management, monitoring/logging, backup/restore planning, and later realtime, AI, finance, and reporting workloads.

No final hosting provider has been selected in the repository. Sprint 0 Day 2 should define the hosting requirements and recommended direction without binding the team to an unvalidated provider.

## Decision Options

| Option | Fit | Tradeoff |
|---|---|---|
| Managed Docker-capable PaaS | Strong MVP fit | Faster setup, less operational control |
| Cloud container platform | Strong long-term fit | More setup and DevOps responsibility |
| Vercel for web plus separate API/worker hosting | Useful for web, mixed for platform | Split deployment model may complicate API/worker and tenant-safe operations |
| Self-managed VPS | Low MVP preference | More operational burden and security responsibility |

## Recommended MVP Hosting Direction

Use a Docker-capable managed platform or cloud container environment that can run:

| Runtime | Requirement |
|---|---|
| `apps/web` | Web frontend deployment |
| `apps/api` | API service deployment |
| `apps/worker` | Background worker deployment |
| PostgreSQL | Managed database or secure managed database connection |
| Redis/queue later | Compatible with Redis/BullMQ or equivalent |
| Object storage later | Compatible with S3-compatible storage |

Final provider selection remains Proposed. The Day 4 baseline approves the required hosting capabilities, environment model, secrets compatibility, and observability compatibility. The final provider and deployment region must be closed or explicitly assigned as accepted risk before Day 5B Sprint 1 Go/No-Go.

## Docker-Capable Deployment Requirement

The hosting platform must support Docker images or an equivalent reproducible deployment model for web, API, and worker services.

## Staging And Production Support

| Environment | Requirement |
|---|---|
| Local | Reproducible local setup plan |
| QA | Test data and validation environment |
| Staging | Production-like pre-release environment |
| UAT | Optional controlled user acceptance environment |
| Production | Protected deployment with rollback path |

## Day 4 Environment Strategy Notes

The deployment strategy is governed by `docs/devops/deployment-environment-strategy.md`. Sprint 1 can proceed only if local/dev, QA, staging/UAT, and production expectations are documented, CI/CD and secrets baselines are accepted, and production-specific provider details are assigned an owner and gate.

## Deployment Region Decision Or Assigned Risk

| Item | Status |
|---|---|
| Preferred direction | EU-first deployment region where provider support allows |
| Current decision | Assigned risk pending final provider and data residency confirmation |
| Risk owner | DevOps Architect / Owner |
| Sprint 1 impact | Not blocking if local/QA/staging setup can proceed without production region lock |
| Production gate | Final region must be approved before production launch |

## Staging/Production Expectation

Staging must be production-like enough to validate deployment, secrets, monitoring, tenant isolation, permission tests, audit events, and rollback readiness. Production must remain protected behind release approval, monitored deployment, and rollback/hotfix governance.

## Secrets And Monitoring Compatibility

| Capability | Requirement |
|---|---|
| Secrets | Environment-scoped secrets, restricted access, rotation support |
| Logs | Application, API, worker, and queue logs |
| Metrics | Uptime, error rate, latency, job failures |
| Audit sensitivity | Logs must not expose raw secrets, payment details, or sensitive AI/file content |
| Rollback | Deployment rollback path must exist before launch |

## Day 4 Status Update

| Area | Status | Notes |
|---|---|---|
| Hosting capability baseline | Approved as requirement baseline | Docker-capable managed platform or cloud container environment |
| Final hosting provider | Proposed | Must be closed or assigned forward by Day 5A |
| Deployment region | Assigned risk | EU-first preference; final region before production |
| Environment strategy | Documented | See deployment/environment strategy |
| Secrets compatibility | Documented | See secrets management plan |
| Monitoring compatibility | Documented | See observability ADR and monitoring baseline |

## Risks

| Risk | Mitigation |
|---|---|
| Provider chosen without worker support | Require web, API, and worker compatibility before approval |
| Secrets implementation differs by provider | Require secrets plan before Sprint 1 |
| Monitoring unavailable or weak | Require observability ADR before Sprint 1 |
| Region/compliance mismatch | Require deployment region decision before environment strategy closes |
| Vendor lock-in too early | Use Docker-capable deployment and standard service boundaries |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Hosting options are documented | Met |
| Recommended MVP hosting direction is documented | Met |
| Docker-capable deployment requirement is documented | Met |
| Staging and production support requirements are documented | Met |
| Secrets and monitoring compatibility requirements are documented | Met |
| No provider-specific implementation was added | Met |

## Open Questions

| Question | Owner Role | Target |
|---|---|---|
| Select final hosting provider | CTO / DevOps Architect | Day 5A assignment or before Sprint 1 environment execution |
| Confirm deployment region | DevOps Architect / Owner | Day 5A assignment; final before production |
| Confirm managed PostgreSQL option | DevOps Architect / Database Architect | Before shared environment database setup |
| Confirm monitoring/logging provider | DevOps Architect | Day 5A assignment or before Sprint 1 operational setup |
