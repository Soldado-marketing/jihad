# Sprint 13 Environment Variable Checklist

## Purpose

Track environment configuration categories needed for launch without storing secret values in the repository.

## Rules

- Do not commit secret values.
- Use environment-specific secret storage.
- Separate local, QA, staging, UAT, and production values.
- Rotate compromised or shared secrets before launch.
- Any missing blocking variable prevents deployment approval.

## Environment Variable Checklist

| Area | Variable Category | Example Name Pattern | Owner Role | Required For Launch | Status |
|---|---|---|---|---:|---|
| API | Runtime environment | `NODE_ENV` | DevOps Architect | Yes | Pending |
| API | API base URL | `API_BASE_URL` | DevOps Architect | Yes | Pending |
| Web | Public web URL | `NEXT_PUBLIC_APP_URL` | Frontend Lead | Yes | Pending |
| Web | Public API URL | `NEXT_PUBLIC_API_URL` | Frontend Lead | Yes | Pending |
| Database | PostgreSQL connection | `DATABASE_URL` | Database Architect | Yes | Pending |
| Database | Shadow/test database | `SHADOW_DATABASE_URL` | Database Architect | Non-production only | Pending |
| Sessions | Session secret | `SESSION_SECRET` | Security Architect | Yes | Pending |
| Redis/Queue | Redis connection | `REDIS_URL` | DevOps Architect | If queue enabled | Pending |
| Storage | S3-compatible endpoint | `STORAGE_ENDPOINT` | DevOps Architect | Sprint 6 placeholder/future | Assigned forward |
| Storage | Storage bucket | `STORAGE_BUCKET` | DevOps Architect | Sprint 6 placeholder/future | Assigned forward |
| Email | Email provider key | `EMAIL_PROVIDER_API_KEY` | DevOps Architect | Invite path or fallback | Pending |
| Monitoring | Error tracking DSN | `ERROR_TRACKING_DSN` | DevOps Architect | Yes | Pending |
| Monitoring | Log provider token | `LOGGING_PROVIDER_TOKEN` | DevOps Architect | Yes | Pending |
| AI | AI provider key | `AI_PROVIDER_API_KEY` | AI Systems Architect | Not active in MVP placeholder | Deferred |
| Transcription | Transcription provider key | `TRANSCRIPTION_PROVIDER_API_KEY` | AI Systems Architect | Not active in MVP placeholder | Deferred |
| Payments | Payment provider key | `PAYMENT_PROVIDER_API_KEY` | Finance Owner | Not active in MVP placeholder | Deferred |

## Acceptance Criteria

- Required launch variables have an owner and environment-specific storage plan.
- Deferred provider variables are not required for MVP launch placeholders.
- No actual secret values appear in this document.
