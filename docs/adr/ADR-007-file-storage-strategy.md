# ADR-007: File Storage Strategy

Status: Proposed

## Context

MAOS MVP includes file uploads and file versioning after Sprint 1. File storage is not required to start Sprint 1, but the future implementation must preserve tenant isolation, client visibility, signed URL security, audit logging, and version history.

## Decision

Use an S3-compatible object storage approach for MVP file storage when file work begins. Keep file metadata, tenant scope, client visibility, version records, and audit references in PostgreSQL. Final object storage provider selection is assigned forward to the Sprint 6 file implementation gate.

## S3-Compatible Storage Expectation

| Requirement | Baseline |
|---|---|
| Storage model | S3-compatible object storage |
| Access model | Application-controlled access with signed URLs |
| Metadata | Stored in PostgreSQL with tenant/resource scope |
| Environments | Separate buckets or prefixes per environment |
| Provider choice | Assigned forward before Sprint 6 file implementation |

## Signed URL Baseline

Signed URLs must be short-lived, generated only after permission checks, scoped to the requested object/version, and never exposed in logs beyond safe references.

## File Versioning Expectation

| Area | Requirement |
|---|---|
| Version records | Each uploaded version has metadata, uploader, timestamp, and tenant/resource scope |
| Current version | Explicit current version pointer or status |
| Client visibility | Visibility can differ by file/version where business rules require |
| Audit | Upload, download, version creation, visibility change, and deletion request are audit-ready |

## Permission Check Before URL Generation

The API must validate tenant, actor, role, resource membership, client visibility, and file/version access before generating upload or download URLs.

## Client Visibility Notes

Client users may access only their own approved/client-visible files and versions. Internal-only files, drafts, unapproved revisions, internal notes, and other-client files must never be exposed through file metadata, previews, or signed URLs.

## Malware Scan Future Path

Malware scanning is a future hardening path. The initial strategy must leave room for quarantine status, scan status, and blocked download behavior before client-visible publication.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| S3-compatible storage expectation is documented | Met |
| Signed URL baseline is documented | Met |
| File versioning expectation is documented | Met |
| Permission check before URL generation is documented | Met |
| Client visibility notes are documented | Met |
| Malware scan future path is documented | Met |
| Final provider is assigned to Sprint 6 gate | Met |

## Open Questions

| Question | Owner Role | Gate |
|---|---|---|
| Select final object storage provider | DevOps Architect / Security Architect | Sprint 6 file implementation gate |
| Define malware scan provider/timing | Security Architect / DevOps Architect | Before client-visible file publication |
| Define storage retention policy | Product Owner / Security Architect | Before MVP launch |
