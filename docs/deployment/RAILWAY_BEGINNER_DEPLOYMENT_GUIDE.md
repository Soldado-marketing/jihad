# Railway Beginner Deployment Guide

## Purpose

This guide is for a non-technical owner deploying MAOS staging manually on Railway for the first time.

This is staging only. Do not mark Production Go after completing this guide.

## What Railway Is

Railway is a hosting platform. It runs the MAOS web app, API app, and PostgreSQL database on the internet so the team can test MAOS before production.

## What GitHub Is Needed For

GitHub stores the MAOS code. Railway connects to GitHub, reads the repository, and deploys the correct folders:

- `apps/api` for the backend API.
- `apps/web` for the frontend website.

Do not connect or deploy SandAroma, WordPress, or WooCommerce.

## Services We Will Create

| Service | What It Does | Railway Source |
|---|---|---|
| PostgreSQL | Staging database | Railway PostgreSQL |
| API service | Backend/API | `apps/api` |
| Web service | Frontend website | `apps/web` |

## Values You Will Need To Copy From Railway

Keep these values private. Do not paste secrets into public chats or documents.

| Value | Where It Comes From |
|---|---|
| Railway API URL | API service public domain |
| Railway Web URL | Web service public domain |
| PostgreSQL `DATABASE_URL` | Railway PostgreSQL service |
| `SESSION_SECRET` | Generate a strong random secret and store it only in Railway |

## Step 1: Create Railway Account

1. Go to Railway.
2. Sign up or log in.
3. Use the approved owner/team account.
4. Set billing/spend alerts before load testing.

## Step 2: Create New Project

1. Click New Project.
2. Name it `maos-staging` or similar.
3. This project is for MAOS only.

## Step 3: Connect GitHub Repository

1. Choose Deploy from GitHub repo.
2. Select the MAOS repository.
3. Confirm this is not SandAroma, WordPress, or WooCommerce.

## Step 4: Add PostgreSQL Database

1. In the Railway project, add a PostgreSQL database service.
2. Name it `maos-postgres-staging` if Railway allows naming.
3. Find the database connection variable called `DATABASE_URL`.
4. You will use this value for the API service later.

## Step 5: Add API Service

1. Add a new service from the same GitHub repository.
2. This service is for the backend API.
3. Name it `maos-api-staging`.

## Step 6: Configure API Root Directory

Set the API service root directory to:

```text
apps/api
```

If Railway asks for a root directory, working directory, source directory, or app directory, use `apps/api`.

## Step 7: Configure API Build/Start Commands

Set:

```text
Build command: npm run build
Start command: npm start
```

The API runtime command behind `npm start` is:

```text
node dist/main.js
```

## Step 8: Add API Environment Variables

Add these to the API service environment variables:

| Variable | What To Enter |
|---|---|
| `NODE_ENV` | `staging` |
| `PORT` | Use Railway default if provided, otherwise `3001` |
| `API_BASE_URL` | Your Railway API public URL, without `/api` |
| `DATABASE_URL` | Railway PostgreSQL `DATABASE_URL` |
| `SESSION_SECRET` | A strong random secret |
| `TENANT_MODE` | `shared_database` |
| `INVITE_FALLBACK_MODE` | `controlled_manual` if email provider is inactive |

Keep these inactive unless separately approved:

| Variable | Value |
|---|---|
| `STORAGE_ENDPOINT` | `inactive` |
| `AI_PROVIDER_API_KEY` | `inactive` |
| `TRANSCRIPTION_PROVIDER_API_KEY` | `inactive` |
| `PAYMENT_PROVIDER_API_KEY` | `inactive` |
| `REALTIME_MODE` | `placeholder` |

## Step 9: Deploy API

1. Click Deploy or let Railway deploy automatically after settings are saved.
2. Wait for build to finish.
3. Open the deployment logs.
4. If it fails, copy the error and use the error report template.

## Step 10: Copy API Public URL

1. Open the API service settings.
2. Find the public URL/domain.
3. Copy it.
4. It should look like:

```text
https://maos-api-staging.up.railway.app
```

## Step 11: Test API Health Endpoint

Open this in your browser:

```text
https://YOUR-API-URL/api/health
```

Expected result: the API should respond successfully.

If you get a 404 or error, do not continue. Send the error report back.

## Step 12: Add Web Service

1. Add another service from the same GitHub repository.
2. This service is for the frontend website.
3. Name it `maos-web-staging`.

## Step 13: Configure Web Root Directory

Set the Web service root directory to:

```text
apps/web
```

If Railway asks for root directory, working directory, source directory, or app directory, use `apps/web`.

## Step 14: Configure Web Build/Start Commands

Set:

```text
Build command: npm run build
Start command: npm start
```

The web runtime command behind `npm start` is:

```text
next start
```

## Step 15: Add Web Environment Variables

Add these to the Web service environment variables:

| Variable | What To Enter |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Your Railway Web public URL |
| `NEXT_PUBLIC_API_URL` | Your Railway API public URL plus `/api` |

Example:

```text
NEXT_PUBLIC_APP_URL=https://maos-web-staging.up.railway.app
NEXT_PUBLIC_API_URL=https://maos-api-staging.up.railway.app/api
```

## Step 16: Deploy Web

1. Click Deploy or let Railway deploy after settings are saved.
2. Wait for build to finish.
3. Open the deployment logs.
4. If it fails, copy the error and use the error report template.

## Step 17: Test Web Dashboard

Open:

```text
https://YOUR-WEB-URL/dashboard
```

Expected result: the MAOS dashboard page loads.

## Step 18: Confirm Web Can Reach API

Check:

1. `NEXT_PUBLIC_API_URL` is set on the Web service.
2. It includes `/api` at the end.
3. The API health URL works in your browser.
4. The Web dashboard loads without a visible API URL typo or runtime error.

## Step 19: Run Smoke Test Checklist

Use:

```text
docs/deployment/railway-smoke-test-checklist.md
```

Minimum checks:

- API health works.
- Web dashboard loads.
- Login/invite placeholder pages load.
- Projects route loads.
- Client route loads.
- Finance is Owner-only.
- Reports route loads.
- No public registration appears.
- Deferred providers remain inactive.

Do not start the 50-user load test until smoke tests pass.

## Step 20: What To Send Back To ChatGPT If There Is An Error

Use:

```text
docs/deployment/railway-error-report-template.md
```

Send:

- Which service failed: Web, API, or PostgreSQL.
- Screenshot or copied log text.
- The step number where it failed.
- Railway URL if available.
- Env var names added, but not secret values.
- Build command.
- Start command.
- Exact error message.
- What changed before the error.

## Do Not Touch These

- Do not change WordPress.
- Do not change SandAroma.
- Do not add a real payment provider.
- Do not add a real AI provider.
- Do not run production migrations.
- Do not mark Production Go.
- Do not change DNS.
- Do not deploy the root Next.js app as MAOS.

## Troubleshooting

### Build Failed

Check:

- Root directory is correct: `apps/api` or `apps/web`.
- Build command is exactly `npm run build`.
- GitHub repo is connected correctly.
- You are not deploying the root app by mistake.

Send the build log using the error report template.

### Start Failed

Check:

- API start command is `npm start`.
- Web start command is `npm start`.
- API root directory is `apps/api`.
- Web root directory is `apps/web`.

Send the runtime log using the error report template.

### `DATABASE_URL` Missing

Check:

- PostgreSQL service exists.
- API service has `DATABASE_URL`.
- `DATABASE_URL` comes from Railway PostgreSQL.
- You did not put `DATABASE_URL` only on the Web service.

### Web Cannot Reach API

Check:

- Web service has `NEXT_PUBLIC_API_URL`.
- The value ends with `/api`.
- API health URL works.
- API service is deployed and public URL is available.

### 404 On `/api/health`

Check:

- You opened `https://YOUR-API-URL/api/health`.
- You did not open the Web URL for API health.
- API service root directory is `apps/api`.
- API start command is `npm start`.

### Environment Variable Not Saved

Check:

- You saved changes in Railway.
- You redeployed after adding variables.
- The variable is on the correct service.
- Secret values were not pasted into documentation.

### Wrong Root Directory

Correct values:

- API root directory: `apps/api`.
- Web root directory: `apps/web`.

If this is wrong, fix it and redeploy.

### Service Deployed But URL Not Opening

Check:

- Railway service has a public domain generated.
- Deployment logs show the service is running.
- Start command is correct.
- Environment variables are present.
- API listens on Railway `PORT`.

Send logs and the URL using the error report template.

## Final Reminder

Completing this guide only prepares staging. Production launch remains No-Go until smoke tests, UAT evidence, 50-user load readiness, migration governance, and production readiness gates are closed.
