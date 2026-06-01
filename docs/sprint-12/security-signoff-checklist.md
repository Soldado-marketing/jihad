# Sprint 12 Security Sign-Off Checklist

## Purpose

Define security sign-off gates for the MVP release candidate.

| Security Gate | Evidence | Owner Role | Status |
|---|---|---|---|
| Tenant isolation | Sprint 11 API hardening tests pass | Security Architect | Ready |
| Permission guards | Protected controllers remain guarded | Security Architect | Ready |
| Service-level scope | Sensitive services validate tenant/resource/owner/client scope | Backend Lead / Security Architect | Ready |
| Client portal boundary | Client surfaces remain client-safe | Security Architect | Ready |
| Owner-only finance | Finance remains Owner-only; client invoice/payment remains safe | Security Architect / Finance Owner | Ready |
| Signed URL safety | Permission check, short TTL, redacted payload markers exist | Security Architect | Ready |
| Realtime/chat safety | Internal/client channels separated; minimal payload placeholder exists | Security Architect | Ready |
| AI/voice safety | No real providers; human confirmation required | AI Systems Architect / Security Architect | Ready |
| Report privacy | Hidden count/total suppression present | Security Architect | Ready |
| Audit redaction | Sensitive payloads are redacted/suppressed | Security Architect | Ready |
| Secrets | No secrets committed; secrets management plan exists | DevOps Architect / Security Architect | Ready |
| Deferred integrations | External provider integrations remain inactive | Security Architect | Ready |

## Sign-Off Rule

Sprint 13 cannot proceed if any security gate is failed, vague, or missing owner approval.
