# Railway Error Report Template

## Purpose

Use this template when Railway deployment fails or a staging URL does not work.

## Error Report

| Field | Fill This In |
|---|---|
| Which service failed | Web / API / PostgreSQL |
| Step where it failed | Example: Step 9 Deploy API |
| Railway URL if available | Paste public URL, not secrets |
| Screenshot/log text | Paste copied log text or describe screenshot |
| Env vars added, without secrets | List variable names only |
| Build command | Example: `npm run build` |
| Start command | Example: `npm start` |
| Error message | Paste exact error |
| What changed before error | Example: changed root directory, added env var, redeployed |
| Did PostgreSQL service exist | Yes / No / Not sure |
| Did `DATABASE_URL` exist on API service | Yes / No / Not sure |
| Did Web `NEXT_PUBLIC_API_URL` include `/api` | Yes / No / Not sure |

## Do Not Include

- Secret values.
- Full `DATABASE_URL`.
- `SESSION_SECRET`.
- API keys.
- Payment, AI, storage, realtime, or transcription keys.

## Quick Copy Format

```text
Service failed:
Step:
Railway URL:
Log/error:
Env var names added:
Build command:
Start command:
What changed before error:
```
