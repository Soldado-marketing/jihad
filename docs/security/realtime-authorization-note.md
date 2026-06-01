# MAOS Realtime Authorization Note

## Channel Authorization

Realtime channel subscriptions must validate authenticated session, tenant context, role, permission, resource membership, and channel membership.

## Membership Checks

Internal chat channels, client chat channels, project/task update channels, and notification channels must each verify membership before subscription.

## Tenant Context

Realtime events and subscriptions must carry tenant context. Cross-tenant subscriptions must be denied.

## Session Revocation Behavior

Realtime sessions should disconnect when the underlying session is revoked. If immediate disconnect is unavailable, short TTL and subscription revalidation must limit exposure.

## Client/Internal Separation

Client chat and client notifications must be scoped separately from internal channels and must never include internal-only payloads.

## Assigned Sprint 7 Gate

Realtime authorization must be approved before chat/notification realtime implementation exits Sprint 7.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Channel authorization is documented | Met |
| Membership checks are documented | Met |
| Tenant context is documented | Met |
| Session revocation behavior is documented | Met |
| Client/internal separation is documented | Met |
| Sprint 7 gate is documented | Met |
