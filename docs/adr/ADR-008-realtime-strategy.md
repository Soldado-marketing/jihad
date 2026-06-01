# ADR-008: Realtime Strategy

Status: Proposed

## Context

MAOS will need realtime behavior for chat, notifications, task updates, approval updates, and future collaboration workflows. Realtime implementation is not required to start Sprint 1, but the authorization model must be clear before chat and notification work begins.

## Decision

Use WebSockets or a managed realtime provider that supports authenticated connections, tenant-scoped channel authorization, membership checks, and session revocation behavior. Final provider selection is assigned to the Sprint 7 realtime/chat gate.

## WebSocket Or Managed Realtime Options

| Option | Fit | Tradeoff |
|---|---|---|
| Native WebSockets through API | Strong control | More operational responsibility |
| Managed realtime service | Faster setup | Provider security and cost need review |
| Polling/SSE fallback | Useful fallback | Less interactive for chat-heavy workflows |

## Channel Authorization

Channel subscriptions must validate tenant, authenticated session, role, permission, resource membership, and client/internal scope. Unauthorized subscription attempts for sensitive channels must be denied and logged safely.

## Session Revocation Behavior

Realtime connections should disconnect on session revocation where supported. If immediate disconnect is not supported, short token/session TTL and subscription revalidation must limit exposure.

## Internal Chat/Client Chat Separation

Internal chat and client chat must use separate channel scopes. Client channels must never include internal notes, internal chat messages, employee costs, payroll, audit events, or other-client data.

## Notification Relevance

Realtime notifications should send minimal payloads and references rather than full sensitive data. Clients receive only client-safe notifications.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Realtime options are documented | Met |
| Channel authorization is documented | Met |
| Session revocation behavior is documented | Met |
| Internal/client chat separation is documented | Met |
| Notification relevance rules are documented | Met |
| Final provider is assigned to Sprint 7 gate | Met |

## Open Questions

| Question | Owner Role | Gate |
|---|---|---|
| Select realtime provider | Principal Software Architect / DevOps Architect | Sprint 7 realtime/chat gate |
| Confirm session revocation implementation | Security Architect / Backend Lead | Sprint 7 gate |
| Confirm realtime cost/load assumptions | DevOps Architect / Product Owner | Before MVP launch |
