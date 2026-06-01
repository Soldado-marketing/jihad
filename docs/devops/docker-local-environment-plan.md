# MAOS Docker Local Environment Plan

## Purpose

Define local Docker-capable setup expectations without creating Docker files or implementation scripts.

## Local Service Placeholders

| Service | Placeholder Purpose |
|---|---|
| Web app | Future `apps/web` local runtime |
| API app | Future `apps/api` local runtime |
| Worker app | Future `apps/worker` local runtime |
| Database | Future PostgreSQL local database |
| Queue | Future Redis/BullMQ or equivalent |
| Object storage | Future S3-compatible local or sandbox storage |

## Docker-Capable Local Plan

The local environment should eventually support reproducible startup for web, API, worker, database, queue, and storage placeholders. No local Docker implementation is created in Day 3.

## No Production Secrets

Production secrets must never be used in local development. Local/dev must use synthetic credentials and non-production test data only.

## Environment File Rules

| Rule | Requirement |
|---|---|
| Example file | `.env.example` may document required variable names without real secrets |
| Local secrets | `.env.local` remains local-only and must not be committed |
| Public variables | Frontend-exposed variables must be explicitly safe |
| Provider keys | Real provider keys are not required for Sprint 0 Day 3 |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Local app/API/database/queue/storage placeholders are documented | Met |
| Docker-capable local plan is documented | Met |
| No production secrets rule is documented | Met |
| Environment file rules are documented | Met |
| No Docker implementation scripts were created | Met |
