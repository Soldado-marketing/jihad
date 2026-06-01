# MAOS Signed URL Security Note

## Permission Check Before Generation

Signed upload/download URLs must only be generated after tenant, role, permission, resource scope, file/version scope, and client visibility checks pass.

## Short TTL

Signed URLs must use short time-to-live values and must not be treated as durable access grants.

## Minimal Payload

Signed URLs and related responses should include only the minimum metadata needed for upload/download. Logs must not store full signed URL secrets.

## Client Visibility Rules

Client users can receive signed URLs only for own client-visible approved files/versions.

## Audit Expectation

Signed URL generation for sensitive files, client files, or downloads must be audit-ready with actor, tenant, resource, action, permission result, and outcome.

## Assigned Sprint 6 Gate

Signed URL security must be approved before file upload/versioning implementation exits Sprint 6.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Permission check before generation is documented | Met |
| Short TTL is documented | Met |
| Minimal payload is documented | Met |
| Client visibility rules are documented | Met |
| Audit expectation is documented | Met |
| Sprint 6 gate is documented | Met |
