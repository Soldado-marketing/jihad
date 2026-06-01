# Railway Environment Variables Template

## Purpose

Placeholder template for Railway staging environment variables. Do not commit real secret values.

## Web Service: `apps/web`

| Variable | Placeholder | Status |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://maos-web-staging.up.railway.app` | Required |
| `NEXT_PUBLIC_API_URL` | `https://maos-api-staging.up.railway.app/api` | Required |
| `ERROR_TRACKING_DSN` | `__OPTIONAL_STAGING_ERROR_TRACKING_DSN__` | Optional/placeholder |

## API Service: `apps/api`

| Variable | Placeholder | Status |
|---|---|---|
| `NODE_ENV` | `staging` | Required |
| `PORT` | Railway-provided or `3001` | Required |
| `API_BASE_URL` | `https://maos-api-staging.up.railway.app` | Required |
| `DATABASE_URL` | Railway PostgreSQL connection variable/reference | Required |
| `SESSION_SECRET` | `__STAGING_SESSION_SECRET__` | Required secret |
| `TENANT_MODE` | `shared_database` | Required |
| `LOGGING_PROVIDER_TOKEN` | `__OPTIONAL_STAGING_LOGGING_TOKEN__` | Optional/placeholder |

## Monitoring Placeholders

| Variable | Placeholder | Status |
|---|---|---|
| `ERROR_TRACKING_DSN` | `__OPTIONAL_STAGING_ERROR_TRACKING_DSN__` | Optional |
| `LOGGING_PROVIDER_TOKEN` | `__OPTIONAL_STAGING_LOGGING_TOKEN__` | Optional |
| `MONITORING_ENVIRONMENT` | `staging` | Optional |

## Inactive Storage Placeholders

| Variable | Placeholder | Status |
|---|---|---|
| `STORAGE_ENDPOINT` | `inactive` | Inactive |
| `STORAGE_BUCKET` | `inactive` | Inactive |
| `STORAGE_ACCESS_KEY_ID` | `inactive` | Inactive |
| `STORAGE_SECRET_ACCESS_KEY` | `inactive` | Inactive |

## Inactive AI/Transcription Placeholders

| Variable | Placeholder | Status |
|---|---|---|
| `AI_PROVIDER_API_KEY` | `inactive` | Inactive |
| `AI_PROVIDER_BASE_URL` | `inactive` | Inactive |
| `TRANSCRIPTION_PROVIDER_API_KEY` | `inactive` | Inactive |
| `TRANSCRIPTION_PROVIDER_BASE_URL` | `inactive` | Inactive |

## Inactive Payment Placeholders

| Variable | Placeholder | Status |
|---|---|---|
| `PAYMENT_PROVIDER_API_KEY` | `inactive` | Inactive |
| `PAYMENT_PROVIDER_WEBHOOK_SECRET` | `inactive` | Inactive |
| `PAYMENT_PROVIDER_MODE` | `manual_placeholder` | Inactive |

## Inactive Realtime Placeholders

| Variable | Placeholder | Status |
|---|---|---|
| `REALTIME_PROVIDER_URL` | `inactive` | Inactive |
| `REALTIME_PROVIDER_KEY` | `inactive` | Inactive |
| `REALTIME_MODE` | `placeholder` | Inactive |

## Rules

- Use Railway environment variables or secret references.
- Do not commit secret values.
- Keep inactive provider values inactive unless separately approved.
- `DATABASE_URL` must point to Railway PostgreSQL for staging.
