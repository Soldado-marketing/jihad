# Staging Environment Variables Template

## Purpose

List required staging/UAT environment variables as placeholders. Do not commit actual secrets.

## Frontend Variables

| Variable | Placeholder Value | Required | Notes |
|---|---|---:|---|
| `NEXT_PUBLIC_APP_URL` | `https://staging.maos.example` | Yes | Public staging web URL |
| `NEXT_PUBLIC_API_URL` | `https://staging-api.maos.example/api` | Yes | Public API base with `/api` prefix |
| `ERROR_TRACKING_DSN` | `__STAGING_ERROR_TRACKING_DSN__` | If configured | Use provider secret store if not public-safe |

## Backend Variables

| Variable | Placeholder Value | Required | Notes |
|---|---|---:|---|
| `NODE_ENV` | `staging` | Yes | Runtime environment |
| `PORT` | `3001` or provider-assigned port | Yes | API reads `PORT` with fallback to `3001` |
| `API_BASE_URL` | `https://staging-api.maos.example` | Yes | API public base URL |
| `DATABASE_URL` | `__STAGING_POSTGRES_URL__` | Yes | Store only in secret manager |
| `SESSION_SECRET` | `__STAGING_SESSION_SECRET__` | Yes | Strong generated secret |
| `TENANT_MODE` | `shared_database` | Yes | MVP tenant model placeholder |
| `LOGGING_PROVIDER_TOKEN` | `__STAGING_LOGGING_TOKEN__` | If configured | Secret manager only |

## Email/Invite Variables

| Variable | Placeholder Value | Required | Notes |
|---|---|---:|---|
| `EMAIL_PROVIDER_API_KEY` | `inactive_or_approved_staging_key` | Conditional | Use only if provider is approved |
| `EMAIL_FROM_ADDRESS` | `no-reply-staging@maos.example` | Conditional | Required if email provider is used |
| `INVITE_FALLBACK_MODE` | `controlled_manual` | Yes if no provider | Must preserve invite-only access |

## Storage Placeholders

| Variable | Placeholder Value | Status |
|---|---|---|
| `STORAGE_ENDPOINT` | `inactive` | Inactive |
| `STORAGE_BUCKET` | `inactive` | Inactive |
| `STORAGE_ACCESS_KEY_ID` | `inactive` | Inactive |
| `STORAGE_SECRET_ACCESS_KEY` | `inactive` | Inactive |

## AI/Transcription Placeholders

| Variable | Placeholder Value | Status |
|---|---|---|
| `AI_PROVIDER_API_KEY` | `inactive` | Inactive |
| `AI_PROVIDER_BASE_URL` | `inactive` | Inactive |
| `TRANSCRIPTION_PROVIDER_API_KEY` | `inactive` | Inactive |
| `TRANSCRIPTION_PROVIDER_BASE_URL` | `inactive` | Inactive |

## Payment Placeholders

| Variable | Placeholder Value | Status |
|---|---|---|
| `PAYMENT_PROVIDER_API_KEY` | `inactive` | Inactive |
| `PAYMENT_PROVIDER_WEBHOOK_SECRET` | `inactive` | Inactive |
| `PAYMENT_PROVIDER_MODE` | `manual_placeholder` | Inactive |

## Realtime Placeholders

| Variable | Placeholder Value | Status |
|---|---|---|
| `REALTIME_PROVIDER_URL` | `inactive` | Inactive |
| `REALTIME_PROVIDER_KEY` | `inactive` | Inactive |
| `REALTIME_MODE` | `placeholder` | Inactive |

## Acceptance Criteria

- Required staging variables are configured in provider secret storage.
- Actual secret values are never committed.
- Inactive providers remain inactive for MVP staging unless separately approved.
