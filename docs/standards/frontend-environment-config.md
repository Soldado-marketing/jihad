# MAOS Frontend Environment Config Standard

## Purpose

Define safe frontend configuration expectations before implementation.

## Public Vs Private Environment Variables

| Category | Rule |
|---|---|
| Public frontend variables | May include safe public API base URL, environment name, and public telemetry DSN where approved |
| Private variables | Must not be exposed to frontend runtime |
| Secrets | Never use public prefixes for secrets |
| Provider keys | Frontend provider keys require Security review before exposure |

## Environment-Specific Config

Local, QA, staging, UAT, and production must use separate config values. Production config must not be reused in local/dev.

## Safe Exposure Rules

Do not expose database URLs, API secrets, token signing secrets, payment keys, AI keys, email provider secrets, storage credentials, or monitoring private keys to the frontend.

## Error Tracking Placeholder

Frontend error tracking may use a public DSN only when configured to redact sensitive payloads and separate environments.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Public/private variable rules are documented | Met |
| Environment-specific config is documented | Met |
| Safe exposure rules are documented | Met |
| Error tracking placeholder is documented | Met |
