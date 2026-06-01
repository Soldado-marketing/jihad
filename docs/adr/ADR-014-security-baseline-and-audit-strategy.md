# ADR-014: Security Baseline And Audit Strategy

Status: Approved

## Context

Sprint 1 will start identity, tenants, sessions, roles, permissions, and audit implementation. MAOS must preserve invite-only access, tenant isolation, RBAC, custom permission foundations, client boundaries, Owner-only finance access, audit logging, and permission-safe service boundaries before any client portal, finance, AI, reporting, or automation work starts.

## Decision

Approve the Sprint 0 security baseline and audit strategy. Sprint 1 implementation must follow this guard pattern and cannot bypass tenant context, permission guards, service-level resource scope validation, or audit redaction requirements.

## Invite-Only And No-Public-Registration Enforcement

| Rule | Requirement |
|---|---|
| Public registration | Forbidden for MVP |
| Account creation | Requires valid invitation or approved admin-created account path |
| Invite lifecycle | Pending, accepted, expired, revoked, and resent states must be supported later |
| Login attempts | Uninvited users must be denied without exposing tenant/user existence |
| Audit | Invite creation, acceptance, revocation, and failed invite acceptance attempts must be audit-ready |

## RBAC And Custom Permission Foundation

| Area | Baseline |
|---|---|
| Roles | Owner, Manager, Employee, Client |
| Owner | Global tenant access except platform-superadmin concerns outside MVP |
| Manager | Assigned/granted operational scope only |
| Employee | Own/assigned work only |
| Client | Own client-visible data only |
| Custom permissions | Foundation must allow explicit grants without weakening default restrictions |
| Finance/payroll | Owner-only by default; explicit grant required later |

## Permission Guard Pattern

| Layer | Requirement |
|---|---|
| Route/controller | Permission guard runs before protected service execution |
| Service | Re-checks resource scope and business-sensitive rules |
| Repository | Requires tenant context for tenant-owned records |
| Worker/job | Uses same service and permission paths where sensitive data/actions are involved |
| Reports/AI/automation | Must not bypass permission engine |

## Service-Level Resource Scope Validation

Sensitive operations must validate tenant, role, permission, resource ownership, client visibility, project/task assignment, and finance/payroll grants where relevant. UI hiding is never sufficient authorization.

## Audit Logging Baseline

Audit records must include:

- Actor.
- Tenant.
- Resource type and resource ID where available.
- Action.
- Permission result.
- Outcome.
- Timestamp.
- Session/device where available.
- Failure reason category where safe.

Audit logs must be append-only from normal application paths. Corrections require a separate correction event, not overwrite.

## Audit Redaction Baseline

Audit logs must not store raw secrets, full payment data, unnecessary file/chat/voice content, sensitive AI prompts unless governed by AI retention policy, or client-confidential payloads beyond the minimum required for traceability.

## Sensitive Controls

| Control Area | Baseline |
|---|---|
| Tenant isolation | Tenant context required for tenant-owned data |
| Client portal | Client-visible and own-client-only rules required |
| Finance | Owner-only by default |
| Payroll | Owner-only or explicit grant only |
| Files | Signed URL generation requires permission check |
| Reports | Hidden counts/totals suppression required later |
| AI | Permission-filtered retrieval required later |

## Tenant Isolation Reference

Tenant isolation is governed by `docs/security/tenant-isolation-baseline.md`, `docs/standards/tenant-id-policy.md`, `docs/standards/tenant-aware-repository-baseline.md`, and ADR-004.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Invite-only and no-public-registration enforcement is documented | Met |
| RBAC and custom permission foundation is documented | Met |
| Permission guard pattern is documented | Met |
| Service-level resource scope validation is documented | Met |
| Audit logging baseline is documented | Met |
| Audit redaction baseline is documented | Met |
| Sensitive controls are documented | Met |
| Tenant isolation references are documented | Met |

## Open Questions

| Question | Owner Role | Gate |
|---|---|---|
| Final MFA/2FA implementation timing | Security Architect / Product Owner | Before production hardening |
| Final audit retention period | Security Architect / Owner | Before production |
| Final security incident tooling | Security Architect / DevOps Architect | Before MVP release candidate |
