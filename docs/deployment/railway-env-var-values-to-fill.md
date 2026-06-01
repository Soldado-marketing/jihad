# Railway Env Var Values To Fill

## Purpose

Owner-facing list of Railway staging environment variables that must be filled manually. Do not store real secrets in this document.

| Variable Name | Service | Example Value Format | Who Provides It | Required/Optional | Notes |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Web | `https://maos-web-staging.up.railway.app` | DevOps Architect / Frontend Lead | Required | Railway web service public URL |
| `NEXT_PUBLIC_API_URL` | Web | `https://maos-api-staging.up.railway.app/api` | DevOps Architect / Frontend Lead | Required | Must include `/api` prefix |
| `ERROR_TRACKING_DSN` | Web/API | `__OPTIONAL_STAGING_ERROR_TRACKING_DSN__` | DevOps Architect | Optional | Placeholder unless monitoring provider is approved |
| `NODE_ENV` | API | `staging` | DevOps Architect | Required | Runtime environment |
| `PORT` | API | Railway provided variable or `3001` fallback | DevOps Architect | Required | API reads `process.env.PORT` |
| `API_BASE_URL` | API | `https://maos-api-staging.up.railway.app` | DevOps Architect / Backend Lead | Required | API service base URL without `/api` |
| `DATABASE_URL` | API/Postgres | Railway PostgreSQL connection reference | Railway / Database Architect | Required | Secret; do not paste into docs |
| `SESSION_SECRET` | API | generated strong secret | Security Architect | Required | Secret; generate and store in Railway only |
| `TENANT_MODE` | API | `shared_database` | Backend Lead / Security Architect | Required | MVP tenant mode |
| `LOGGING_PROVIDER_TOKEN` | API | `__OPTIONAL_STAGING_LOGGING_TOKEN__` | DevOps Architect | Optional | Placeholder unless logging provider is approved |
| `MONITORING_ENVIRONMENT` | API/Web | `staging` | DevOps Architect | Optional | Useful for monitoring labels |
| `EMAIL_PROVIDER_API_KEY` | API | `inactive` or approved staging key | DevOps Architect | Optional | Keep inactive unless approved |
| `EMAIL_FROM_ADDRESS` | API | `no-reply-staging@maos.example` | Product Owner / DevOps Architect | Optional | Required only if email provider is approved |
| `INVITE_FALLBACK_MODE` | API | `controlled_manual` | Product Owner / Security Architect | Required if no email provider | Preserves invite-only flow |
| `STORAGE_ENDPOINT` | API | `inactive` | Security Architect | Optional/inactive | Do not activate storage provider |
| `STORAGE_BUCKET` | API | `inactive` | Security Architect | Optional/inactive | Do not activate storage provider |
| `STORAGE_ACCESS_KEY_ID` | API | `inactive` | Security Architect | Optional/inactive | Do not store real key |
| `STORAGE_SECRET_ACCESS_KEY` | API | `inactive` | Security Architect | Optional/inactive | Do not store real secret |
| `AI_PROVIDER_API_KEY` | API | `inactive` | AI Systems Architect / Security Architect | Optional/inactive | Do not activate AI provider |
| `AI_PROVIDER_BASE_URL` | API | `inactive` | AI Systems Architect / Security Architect | Optional/inactive | Do not activate AI provider |
| `TRANSCRIPTION_PROVIDER_API_KEY` | API | `inactive` | AI Systems Architect / Security Architect | Optional/inactive | Do not activate transcription provider |
| `TRANSCRIPTION_PROVIDER_BASE_URL` | API | `inactive` | AI Systems Architect / Security Architect | Optional/inactive | Do not activate transcription provider |
| `PAYMENT_PROVIDER_API_KEY` | API | `inactive` | Finance Owner / Security Architect | Optional/inactive | Do not activate payment provider |
| `PAYMENT_PROVIDER_WEBHOOK_SECRET` | API | `inactive` | Finance Owner / Security Architect | Optional/inactive | Do not activate payment provider |
| `PAYMENT_PROVIDER_MODE` | API | `manual_placeholder` | Finance Owner | Optional/inactive | MVP payment placeholder |
| `REALTIME_PROVIDER_URL` | API/Web | `inactive` | DevOps Architect / Security Architect | Optional/inactive | Do not activate realtime provider |
| `REALTIME_PROVIDER_KEY` | API/Web | `inactive` | DevOps Architect / Security Architect | Optional/inactive | Do not store real key |
| `REALTIME_MODE` | API/Web | `placeholder` | DevOps Architect / Backend Lead | Optional/inactive | MVP realtime placeholder |

## Rules

- Fill real values only in Railway environment variables or approved secret storage.
- Do not commit secrets.
- Keep inactive providers inactive unless separately approved.
- `DATABASE_URL` should come from Railway PostgreSQL service reference.
