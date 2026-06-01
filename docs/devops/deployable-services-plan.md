# MAOS Deployable Services Plan

## Purpose

Define the MVP service boundaries that deployment planning must support. This plan does not implement services.

## Deployable Services

| Service | Purpose | MVP Requirement |
|---|---|---|
| Web service | Frontend application | Deployable as root app now or future `apps/web` migration target |
| API service | Backend REST API | Docker-capable service target |
| Worker service | Background jobs | Docker-capable worker target for later queues/jobs |
| Database | PostgreSQL | Managed or secured database connection |
| Queue/cache | Redis/BullMQ or equivalent | Required before worker-backed jobs |
| Object storage placeholder | S3-compatible files later | Required before file upload/versioning implementation |
| Monitoring/logging | Observability | Required before Sprint 1 readiness |

## Service Dependency Notes

| Service | Depends On |
|---|---|
| Web | API URL, frontend config, monitoring |
| API | PostgreSQL, secrets, audit baseline, monitoring |
| Worker | Queue/cache, PostgreSQL, tenant/actor context, monitoring |
| Database | Backup/restore, migration governance, tenant hardening |
| Object storage | Signed URL policy, file metadata, malware scan path later |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Web service boundary is documented | Met |
| API service boundary is documented | Met |
| Worker service boundary is documented | Met |
| Database, queue/cache, object storage placeholders are documented | Met |
| Monitoring/logging dependency is documented | Met |
