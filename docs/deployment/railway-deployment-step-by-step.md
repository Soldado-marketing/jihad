# Railway Deployment Step By Step

## Purpose

Step-by-step Railway staging deployment guide for MAOS MVP. This document does not deploy automatically.

## Beginner Owner Guide

For a non-technical owner, use `docs/deployment/RAILWAY_BEGINNER_DEPLOYMENT_GUIDE.md` first.

If Railway shows an error, use `docs/deployment/railway-error-report-template.md` and send the completed report back for troubleshooting.

## Step 1: Create Railway Account And Project

1. Create or use approved Railway account/workspace.
2. Create a project named `maos-staging` or equivalent.
3. Configure usage alerts or spend controls before load testing.

## Step 2: Connect GitHub Repository

1. Connect the MAOS repository to Railway.
2. Confirm Railway can deploy services from monorepo paths.
3. Confirm SandAroma, WordPress, and WooCommerce are not connected or deployed.

## Step 3: Create Web Service

| Setting | Value |
|---|---|
| Service path | `apps/web` |
| Root/working directory | `apps/web` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Runtime | `next start` |
| Required URL | Railway generated staging web URL |

The web start command decision is resolved. Railway should run the web service from `apps/web`.

## Step 4: Create API Service

| Setting | Value |
|---|---|
| Service path | `apps/api` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Runtime | `node dist/main.js` |
| Health endpoint | `/api/health` |

## Step 5: Create PostgreSQL Service

1. Add Railway PostgreSQL.
2. Attach or reference `DATABASE_URL` from API service.
3. Confirm no production data is used.
4. Confirm staging reset policy.

## Step 6: Configure Environment Variables

Use `docs/deployment/railway-env-vars-template.md`.

Required:

- Web `NEXT_PUBLIC_APP_URL`.
- Web `NEXT_PUBLIC_API_URL`.
- API `NODE_ENV`.
- API `PORT`.
- API `API_BASE_URL`.
- API `DATABASE_URL`.
- API `SESSION_SECRET`.
- API `TENANT_MODE`.

Inactive:

- Storage.
- AI/transcription.
- Payment.
- Realtime.

## Step 7: Deploy Web

1. Deploy `apps/web` with root/working directory `apps/web`, build command `npm run build`, and start command `npm start`.
2. Verify web staging URL loads.
3. Verify no root Next.js app was deployed by mistake.

## Step 8: Deploy API

1. Deploy `apps/api`.
2. Verify the API starts successfully.
3. Verify `/api/health` responds.

## Step 9: Verify Frontend Can Reach API

1. Confirm `NEXT_PUBLIC_API_URL` points to Railway API URL plus `/api`.
2. Load web staging URL.
3. Verify API health placeholder or related API connectivity marker.

## Step 10: Create Test Accounts

Create through invite-only process:

- Owner.
- Manager.
- Employee.
- Client.

No public registration is allowed.

## Step 11: Run Smoke Test

Required smoke checks:

- Web URL loads.
- API `/api/health` responds.
- Dashboard route loads.
- Client portal route loads.
- Owner-only finance route is not exposed to non-Owner roles.
- Deferred providers remain inactive.

## Step 12: Prepare 50-User Load Test

1. Select approved load testing tool.
2. Configure scenarios from `docs/sprint-13/50-user-load-test-execution-plan.md`.
3. Confirm Railway usage/cost limits.
4. Execute test only after staging smoke tests pass.
5. Attach load report to launch gate evidence.

## Production Reminder

Production architecture remains deferred until after staging/UAT and the 50-user load readiness review. Production launch remains No-Go.
