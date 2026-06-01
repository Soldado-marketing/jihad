# MAOS Secrets Management Plan

## Purpose

Define the Sprint 0 baseline for secrets handling before Sprint 1 implementation starts.

## Secret Storage Expectations

| Area | Requirement |
|---|---|
| Storage | Secrets must live in approved environment/provider secret storage, not source files |
| Local development | Local secrets use ignored environment files or approved developer secret tooling |
| CI/CD | CI/CD secrets must be scoped to environment and repository access |
| Production | Production secrets require restricted access and auditability |
| Rotation | Rotation procedure must exist for critical secrets before production |

## Environment Separation

| Environment | Rule |
|---|---|
| Local/dev | Fake, sandbox, or developer-specific values only |
| QA/UAT | Test credentials and isolated test data |
| Staging | Production-like secrets without production data exposure |
| Production | Restricted secrets with least-privilege access |

## Access Control

Only the DevOps Architect, CTO, and explicitly approved maintainers may manage production secrets. No normal developer workflow should require reading production secrets.

## Audit Expectation

Changes to production secrets must be logged by the provider where supported and referenced in release or incident records when relevant.

## No Secrets In Code

Secrets, tokens, passwords, private keys, provider API keys, webhook signing secrets, and database credentials must never be committed to the repository.

## Local/Dev Handling

Local environment examples may document variable names, but values must be placeholders only. Local `.env` files must remain ignored and must not contain production values.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Secret storage expectations are documented | Met |
| Environment separation is documented | Met |
| Access control is documented | Met |
| Audit expectation is documented | Met |
| No-secrets-in-code rule is documented | Met |
| Local/dev handling is documented | Met |
| Sprint 1 may proceed only after secret handling is accepted by DevOps and Security | Met |
