# Railway Manual Deployment Runbook

## Purpose

Manual Railway staging deployment instructions for MAOS MVP. This runbook does not deploy automatically and does not activate external providers.

## Preconditions

- Railway account/workspace is approved.
- Repository is available in GitHub for Railway connection.
- Railway all-in-one staging decision is approved.
- Production remains No-Go.
- SandAroma, WordPress, and WooCommerce are ignored completely.

## 1. Create Railway Project

1. Sign in to Railway.
2. Create a new project named `maos-staging` or equivalent.
3. Configure usage alerts/spend controls before load testing.
4. Record the Railway project URL in launch evidence.

## 2. Connect GitHub Repository

1. Connect the MAOS GitHub repository.
2. Confirm Railway detects the monorepo.
3. Confirm the root app is not used for MAOS staging services.
4. Confirm no SandAroma, WordPress, or WooCommerce deployment is connected.

## 3. Create PostgreSQL Service

1. Add a Railway PostgreSQL service.
2. Name it `maos-postgres-staging` or equivalent.
3. Confirm Railway exposes a `DATABASE_URL` value or reference.
4. Do not import production data.
5. Record reset/backup expectations for staging.

## 4. Create API Service

| Setting | Value |
|---|---|
| Service name | `maos-api-staging` |
| Root directory | `apps/api` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Runtime | `node dist/main.js` |
| Health endpoint | `/api/health` |

## 5. Add API Environment Variables

Set values from `docs/deployment/railway-env-var-values-to-fill.md`.

Required API variables:

- `NODE_ENV`
- `PORT`
- `API_BASE_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `TENANT_MODE`

Optional/placeholder API variables:

- `LOGGING_PROVIDER_TOKEN`
- `ERROR_TRACKING_DSN`
- inactive storage placeholders
- inactive AI/transcription placeholders
- inactive payment placeholders
- inactive realtime placeholders

## 6. Deploy API

1. Trigger API deployment.
2. Review build logs.
3. Review runtime logs.
4. Confirm the API service is listening on Railway-provided `PORT`.
5. Confirm no production migration was created.

## 7. Verify API Health Endpoint

1. Open the Railway API domain.
2. Verify `https://<api-domain>/api/health`.
3. Capture response evidence.
4. If health fails, stop and inspect API logs before continuing.

## 8. Create Web Service

| Setting | Value |
|---|---|
| Service name | `maos-web-staging` |
| Root directory | `apps/web` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Runtime | `next start` |

## 9. Add Web Environment Variables

Required web variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`

Optional/placeholder web variables:

- `ERROR_TRACKING_DSN`

`NEXT_PUBLIC_API_URL` must point to the Railway API URL including `/api`.

## 10. Deploy Web

1. Trigger web deployment.
2. Review build logs.
3. Review runtime logs.
4. Confirm the web staging URL loads.
5. Confirm the root Next.js app was not deployed by mistake.

## 11. Verify Web Can Reach API

1. Open the web staging URL.
2. Confirm the dashboard or API placeholder references the Railway API URL.
3. Confirm API health can be reached from the configured URL.
4. Capture screenshot/log evidence.

## 12. Create Test Accounts

Create staging/UAT accounts through the approved invite-only process:

- Owner.
- Manager.
- Employee.
- Client.

Public registration must remain unavailable.

## 13. Run Smoke Tests

Use `docs/deployment/railway-smoke-test-checklist.md`.

Minimum smoke checks:

- API health.
- Web dashboard route.
- API URL configuration.
- Invite/login placeholder path.
- Projects route.
- Client route.
- Finance owner-only boundary.
- Reports route.
- No public registration.
- Client boundary.

## 14. Prepare 50-User Load Test

1. Select approved load test tool.
2. Use `docs/sprint-13/50-user-load-test-execution-plan.md`.
3. Confirm Railway usage alerts/spend controls.
4. Run load test only after smoke tests pass.
5. Attach load test evidence to launch gate documentation.

## Completion Criteria

- API service deployed and health endpoint verified.
- Web service deployed and API URL verified.
- PostgreSQL connected to API.
- Smoke tests passed.
- Test accounts created.
- 50-user load test can be scheduled.
