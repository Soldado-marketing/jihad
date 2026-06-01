# MAOS Audit Logging Baseline

## Purpose

Define the audit fields, protection model, and Sprint 1 baseline for sensitive action traceability.

## Required Audit Fields

| Field | Requirement |
|---|---|
| Audit event ID | Unique event identifier |
| Tenant ID | Required for tenant-scoped events |
| Actor ID | Acting user or system actor |
| Actor role | Role at time of action where available |
| Resource type | Object category affected |
| Resource ID | Object identifier where safe and available |
| Action | Action attempted or completed |
| Permission result | Allowed, denied, or not evaluated |
| Outcome | Success, failure, blocked, or partial |
| Timestamp | Server-side timestamp |
| Session ID | Required where available |
| Device ID | Required where available |
| Failure category | Safe category for failures |

## Actor/Tenant/Resource/Action/Outcome

Every sensitive audit event must be traceable to actor, tenant, resource, action, and outcome. If resource ID cannot be safely logged, use a redacted reference and safe category.

## Permission Result

Audit entries for sensitive operations must record permission result before and after service-level scope validation where practical.

## Session/Device Where Available

Session and device information is required when the action originates from an authenticated user session. System jobs must record runtime actor/effective actor where applicable.

## Append-Only Policy

Normal application paths cannot update or delete audit records. Operational corrections require a separate correction event.

## Correction Event Policy

Audit corrections must reference the original audit event ID, reason, correcting actor, timestamp, and safe correction category. The original event remains immutable.

## Access Restrictions

Audit log access is restricted to Owner and explicit security-grant roles. Client users cannot access audit logs. Managers and employees cannot access global audit logs.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Required audit fields are documented | Met |
| Actor/tenant/resource/action/outcome model is documented | Met |
| Permission result requirement is documented | Met |
| Session/device requirement is documented | Met |
| Append-only policy is documented | Met |
| Correction event policy is documented | Met |
| Access restrictions are documented | Met |
