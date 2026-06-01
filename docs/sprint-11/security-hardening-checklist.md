# Sprint 11 Security Hardening Checklist

## Purpose

Validate MVP security boundaries before release candidate work begins.

## Hardening Matrix

| Control Area | Required Check | Evidence | Blocking Criteria | Status |
|---|---|---|---|---|
| Tenant isolation | Tenant-owned MVP models include `tenantId`; repositories require tenant context | API hardening test | Missing tenantId or tenant-aware repository marker | Ready |
| Permission guard coverage | Protected MVP controllers use `PermissionGuard` and `RequirePermission` | API hardening test | Unguarded protected controller | Ready |
| Service scope validation | Sensitive services call resource scope or owner-only validators | API hardening test | Sensitive path bypasses service-level validation | Ready |
| Client portal boundary | Client payloads exclude internal notes, audit logs, payroll, costs, internal chat, and other-client data | API and web hardening tests | Client surface leaks internal data | Ready |
| Owner-only finance | Finance, revenue, cost, invoice, and payment internal routes remain sensitive and owner-gated | API and web hardening tests | Non-owner finance exposure | Ready |
| Signed URL security | Signed URL placeholder checks permission, uses short TTL, and redacts payload | API hardening test | URL generation lacks permission or TTL marker | Ready |
| Chat/realtime boundary | Realtime placeholder requires tenant context and minimal payload; internal/client channel separation exists | API hardening test | Internal chat exposed to client or payload not minimal | Ready |
| AI/voice safety | No external AI/transcription calls; human confirmation is required; transcript/prompt payloads are redacted | API and web hardening tests | Real provider call or automatic task creation | Ready |
| Report privacy | Hidden count/total suppression is present in dashboard/report flows | API and web hardening tests | Hidden totals exposed | Ready |
| Audit redaction | Audit payloads use redacted/suppressed placeholders for sensitive content | API hardening test | Raw secrets, full payment data, chat body, or transcript payload appears | Ready |
| Deferred integrations | Payment provider, storage provider, realtime provider, AI provider, report export, and automation integrations remain inactive | API and web hardening tests | External integration is activated | Ready |

## Required Security Evidence

| Evidence ID | Required Artifact |
|---|---|
| S11-SEC-TENANT | Tenant isolation hardening test output |
| S11-SEC-PERMISSION | Permission guard coverage test output |
| S11-SEC-CLIENT | Client portal boundary test output |
| S11-SEC-FINANCE | Owner-only finance test output |
| S11-SEC-AI | AI/voice safety test output |
| S11-SEC-REPORTS | Hidden count/total suppression test output |

## Exit Criteria

- No critical or high security blocker remains open.
- Any medium issue has an owner, mitigation, and release gate.
- Sprint 12 cannot start if tenant, permission, client boundary, finance, AI, report, or audit controls fail.
