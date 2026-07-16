# SPRINT 13 — Deployment Setup Execution Report

**Project:** MAOS — MVP Production Launch
**Sprint:** 13 — Public Registration with Owner Approval
**Report date:** 2026-06-13
**Continues from:** `docs/sprint-13/SPRINT13_DEPLOYMENT_PREFLIGHT_AUTH_E2E.md`
**Previous verdict:** DEPLOYMENT PREFLIGHT CONDITIONALLY PASSED — ENV/DB SETUP REQUIRED

---

## FINAL STATUS

```
DEPLOYMENT SETUP READY — WAITING FOR USER ENV VALUES
```

All infrastructure files are correctly configured for Docker Compose / VPS deployment.
The only required actions are: **create a `.env` file with your real values** and **run the deploy command**.
No code changes needed. No Dockerfiles need editing. No docker-compose.yml needs editing.

---

## Section 1 — Detected Deployment Target

**Target: Docker Compose (VPS / Self-hosted)**

Evidence found in the codebase:

| File | Exists | Notes |
|------|--------|-------|
| `docker-compose.yml` | ✅ YES | Full production stack: postgres + redis + api + web |
| `docker-compose.dev.yml` | ✅ YES | Dev mode: postgres + redis only |
| `apps/api/Dockerfile` | ✅ YES | Multi-stage NestJS production build |
| `apps/web/Dockerfile` | ✅ YES | Multi-stage Next.js standalone build |
| `apps/api/.dockerignore` | ✅ YES | Excludes node_modules, dist, .env |
| `apps/web/.dockerignore` | ✅ YES | Excludes node_modules, .next, .env |
| `setup.sh` | ✅ YES | First-run development setup script |
| `railway.toml` | ❌ NO | Railway not configured |
| `vercel.json` | ❌ NO | Vercel not configured |
| `nixpacks.toml` | ❌ NO | Nixpacks not configured |
| `fly.toml` | ❌ NO | Fly.io not configured |
| `render.yaml` | ❌ NO | Render not configured |
| `.github/workflows/` | ❌ NO | No CI/CD pipeline yet |

**Confirmed target: Docker Compose on VPS** (Hostinger, DigitalOcean, Hetzner, or any Linux server).
Railway is also viable — see Section 5B if you prefer that route.

---

## Section 2 — Production Environment Checklist

### Root-level `.env` file (required by docker-compose.yml)

The `docker-compose.yml` reads secrets from a **root-level `.env` file** via `${VARIABLE}` syntax.
`DATABASE_URL` and `REDIS_URL` are hardcoded in the compose file (pointing to internal postgres/redis services) — you do **not** override those.

Create this file at the project root: `/path/to/your/project/.env`

```
# MAOS Production — Root .env for docker-compose
# DO NOT COMMIT THIS FILE

# ── JWT Secrets (generate with: openssl rand -base64 48) ──────────────────────
JWT_SECRET=<GENERATE_WITH_OPENSSL>
JWT_REFRESH_SECRET=<GENERATE_WITH_OPENSSL_DIFFERENT_VALUE>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Frontend URLs ─────────────────────────────────────────────────────────────
WEB_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
# (or http://YOUR_SERVER_IP:3001 if no reverse proxy yet)

# ── Optional: SMTP ────────────────────────────────────────────────────────────
# Leave blank to disable email — system works without it
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# ── Optional: S3 / Cloudflare R2 ─────────────────────────────────────────────
# Leave blank to disable file uploads
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=

# ── Optional: OpenAI ─────────────────────────────────────────────────────────
OPENAI_API_KEY=
```

### Env var status

| Variable | Where it comes from | Status |
|----------|-------------------|--------|
| `DATABASE_URL` | Hardcoded in docker-compose.yml → internal postgres | ✅ AUTO — no action needed |
| `REDIS_URL` | Hardcoded in docker-compose.yml → internal redis | ✅ AUTO — no action needed |
| `NODE_ENV` | Hardcoded `production` in docker-compose.yml | ✅ AUTO — no action needed |
| `PORT` | Hardcoded `3001` in docker-compose.yml | ✅ AUTO — no action needed |
| `JWT_SECRET` | Root `.env` → `${JWT_SECRET}` | ⛔ **YOU MUST SET** |
| `JWT_REFRESH_SECRET` | Root `.env` → `${JWT_REFRESH_SECRET}` | ⛔ **YOU MUST SET** |
| `JWT_EXPIRES_IN` | Root `.env` (default: 15m) | ✅ Has fallback default |
| `JWT_REFRESH_EXPIRES_IN` | Root `.env` (default: 7d) | ✅ Has fallback default |
| `WEB_URL` | Root `.env` (default: http://localhost:3000) | ⚠️ Set for production (CORS) |
| `NEXT_PUBLIC_API_URL` | Root `.env` (default: http://localhost:3001) | ⚠️ Set for production |
| `SMTP_*` | Root `.env` (optional) | ✅ Optional — safe to leave blank |
| `S3_*` | Root `.env` (optional) | ✅ Optional — safe to leave blank |
| `OPENAI_API_KEY` | Root `.env` (optional) | ✅ Optional — safe to leave blank |

**Minimum required to deploy:** only `JWT_SECRET` and `JWT_REFRESH_SECRET`.
Everything else has safe defaults or is optional for MVP.

---

## Section 3 — Secret Generation Commands

Run these commands on your local machine or server. **Do not save the output to any file in this repo.**

```bash
# Generate JWT_SECRET
openssl rand -base64 48

# Generate JWT_REFRESH_SECRET (run separately — must be a DIFFERENT value)
openssl rand -base64 48
```

**Rules:**
- Each command produces a different random string — use them for different variables
- Both must be at least 32 characters (base64-48 produces 64 chars — well above minimum)
- Never paste these into any file tracked by git
- Store in a password manager or server secret store (e.g., Hetzner Vault, Bitwarden, 1Password)

---

## Section 4 — Database Setup

**Status: DB CREATION REQUIRED (handled automatically by Docker Compose)**

The `docker-compose.yml` includes a fully configured `postgres` service:

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: maos_db
    POSTGRES_USER: maos
    POSTGRES_PASSWORD: maos_password
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U maos -d maos_db']
```

This means:
- PostgreSQL is **created automatically** when you run `docker compose up`
- The database `maos_db` with user `maos` is created on first start
- The `DATABASE_URL` used by the API container is already set: `postgresql://maos:maos_password@postgres:5432/maos_db`
- **No external DB service is needed for VPS deployment**

**Migration status:**

| Migration | File | Status |
|-----------|------|--------|
| `20240101000000_add_password_hash` | ✅ exists | Will run automatically on first deploy |
| `20260612000000_add_public_registration_approval` | ✅ exists | Will run automatically on first deploy |

Migrations run automatically via the Dockerfile CMD:
```
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

This is idempotent — safe on every restart and redeploy.

**No action required for database.** Docker Compose handles it end-to-end.

---

## Section 5A — Deployment Execution Plan: Docker Compose (VPS)

### Prerequisites

- VPS running Ubuntu 22.04+ (Hostinger VPS, Hetzner, DigitalOcean, etc.)
- Docker + Docker Compose installed on the server
- Git installed on the server
- Ports 3000 and 3001 open (or a reverse proxy configured)

### Step 1: Clone the repository on your server

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git maos
cd maos
```

### Step 2: Create the root .env file

```bash
# Create .env from your values
cat > .env << 'EOF'
JWT_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE
JWT_REFRESH_SECRET=PASTE_YOUR_OTHER_GENERATED_SECRET_HERE
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
WEB_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
EOF
```

Or copy and edit manually:
```bash
cp apps/api/.env.production.example .env
nano .env
```

### Step 3: Build and start all services

```bash
docker compose up -d --build
```

This command:
1. Builds the API image (NestJS multi-stage build)
2. Builds the Web image (Next.js standalone build)
3. Starts postgres container
4. Starts redis container
5. Starts api container (waits for postgres health check, then runs migrations + starts server)
6. Starts web container (waits for api)

Expected build time: 3–6 minutes on first run.

### Step 4: Verify all services are running

```bash
# Check container status
docker compose ps

# Expected output:
# NAME          STATUS          PORTS
# maos-postgres Running (healthy)
# maos-redis    Running (healthy)
# maos-api      Running         0.0.0.0:3001->3001/tcp
# maos-web      Running         0.0.0.0:3000->3000/tcp
```

### Step 5: Check logs

```bash
# API logs (watch for "Application is running on port 3001")
docker compose logs -f api

# Web logs
docker compose logs -f web

# Postgres logs (watch for "database system is ready")
docker compose logs -f postgres
```

### Step 6: Verify health endpoint

```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok"}
```

---

## Section 5B — Alternative: Railway Deployment

If you prefer Railway instead of a VPS, follow these steps:

### Railway setup

1. Go to [railway.app](https://railway.app) and create a new project
2. Add a **PostgreSQL** service (Railway provides a free one)
3. Add a **Redis** service (Railway provides a free one)
4. Add a new service → "Deploy from GitHub repo" → select your repository
5. Set the **Root Directory** to `apps/api`
6. Railway will detect the Dockerfile automatically

### Environment variables for Railway API service

Set these in Railway's Variables tab:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}    ← Railway injects this automatically
REDIS_URL=${{Redis.REDIS_URL}}             ← Railway injects this automatically
JWT_SECRET=<your generated secret>
JWT_REFRESH_SECRET=<your other generated secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
WEB_URL=https://your-web.railway.app
```

5. Add another service → "Deploy from GitHub" → set root to `apps/web`
6. Set `NEXT_PUBLIC_API_URL=https://your-api.railway.app/api`
7. Railway auto-runs the Dockerfile CMD: `prisma migrate deploy && node dist/main.js`

---

## Section 6 — Migration Verification

**Confirmed: Migrations run automatically on every API container start.**

Dockerfile CMD (line 47 of `apps/api/Dockerfile`):
```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

Behavior:
- On **first deploy**: applies both migrations (`20240101000000_add_password_hash` and `20260612000000_add_public_registration_approval`)
- On **subsequent deploys**: checks migration history, applies only new ones, skips already-applied ones
- **Idempotent**: safe to run on every restart — never re-runs completed migrations

Migration status after first deploy will be:

```
Applying migration `20240101000000_add_password_hash`  ← first time only
Applying migration `20260612000000_add_public_registration_approval`  ← first time only
All migrations have been successfully applied.
```

**No manual `prisma migrate deploy` command is needed.** The container handles it.

---

## Section 7 — First Owner Bootstrap Command

**Run this ONCE after the API is live.** Bootstrap is blocked on the second call.

```bash
# Replace all placeholders with your real values
curl -X POST http://YOUR_SERVER_IP:3001/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@yourdomain.com",
    "password": "YourSecurePassword123!",
    "fullName": "Your Full Name",
    "tenantName": "Your Agency Name",
    "tenantSlug": "your-agency"
  }'
```

**For VPS with domain + reverse proxy:**
```bash
curl -X POST https://yourdomain.com/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@yourdomain.com",
    "password": "YourSecurePassword123!",
    "fullName": "Your Full Name",
    "tenantName": "Your Agency Name",
    "tenantSlug": "your-agency"
  }'
```

**Expected response (success):**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "user": {
    "id": "...",
    "email": "owner@yourdomain.com",
    "role": "OWNER"
  }
}
```

**Save the tokens** — you need the `access_token` to call admin endpoints.

**What bootstrap does:**
- Creates the first Tenant with your `tenantName` and `tenantSlug`
- Creates the Owner User with `APPROVED` status
- Creates a TenantMembership with role `OWNER`
- Creates an audit event in the DB
- Returns JWT access + refresh tokens
- **Locks itself** — any future call returns `403 Forbidden`

---

## Section 8 — Post-Deploy E2E Checklist

Run these commands after first deploy. Replace `BASE_URL` and `OWNER_TOKEN` with your values.

### 8.1 Health check

```bash
curl http://BASE_URL:3001/api/health
# Expected: {"status":"ok"}
```

### 8.2 Bootstrap first Owner

```bash
curl -X POST http://BASE_URL:3001/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@yourdomain.com","password":"Password123!","fullName":"Owner","tenantName":"Agency","tenantSlug":"agency"}'
# Expected: 201 with access_token + user.role = "OWNER"
```

### 8.3 Confirm bootstrap is now locked

```bash
curl -X POST http://BASE_URL:3001/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"second@test.com","password":"Password123!","fullName":"Test","tenantName":"Test","tenantSlug":"test"}'
# Expected: 403 Forbidden
```

### 8.4 Register a new user (public registration)

```bash
curl -X POST http://BASE_URL:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"testuser@example.com","password":"TestPass123!","requestedAccountType":"team_member","tenantSlug":"agency"}'
# Expected: 201 {"message":"Your account request was received..."}
```

### 8.5 Pending user login must be blocked

```bash
curl -X POST http://BASE_URL:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"TestPass123!","tenantSlug":"agency"}'
# Expected: 403 with message about pending approval
```

### 8.6 Owner login to get token

```bash
curl -X POST http://BASE_URL:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@yourdomain.com","password":"Password123!","tenantSlug":"agency"}'
# Expected: 200 with access_token
# Save: OWNER_TOKEN=<access_token from response>
```

### 8.7 List pending registration requests

```bash
curl -H "Authorization: Bearer $OWNER_TOKEN" \
  http://BASE_URL:3001/api/admin/users/requests
# Expected: 200 with array containing testuser@example.com with status PENDING
# Save: REQUEST_ID=<id from first result>
```

### 8.8 Approve the user

```bash
curl -X POST http://BASE_URL:3001/api/admin/users/requests/$REQUEST_ID/approve \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"EMPLOYEE","visibilityScope":"ASSIGNED_ITEMS_ONLY"}'
# Expected: 200 {"message":"User approved"} or similar
```

### 8.9 Approved user login must now succeed

```bash
curl -X POST http://BASE_URL:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"TestPass123!","tenantSlug":"agency"}'
# Expected: 200 with access_token
```

### 8.10 Non-Owner cannot access admin endpoints

```bash
USER_TOKEN=<access_token from 8.9>
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://BASE_URL:3001/api/admin/users/requests
# Expected: 403 Forbidden (not Owner)
```

### 8.11 Audit event verification (if DB access is available)

```bash
# Connect to postgres container
docker exec -it maos-postgres-1 psql -U maos -d maos_db

# Inside psql:
SELECT "eventType", "actorId", "targetId", "createdAt"
FROM "AuditEvent"
ORDER BY "createdAt" DESC
LIMIT 10;
# Expected: rows for bootstrap, register, approve events
```

---

## Summary Table

| Item | Status | Action Required |
|------|--------|----------------|
| Deployment target | ✅ Docker Compose / VPS | None — files ready |
| docker-compose.yml | ✅ Complete and correct | None |
| API Dockerfile | ✅ Multi-stage, correct | None |
| Web Dockerfile | ✅ Standalone, correct | None |
| DATABASE_URL | ✅ Auto-configured (internal postgres) | None |
| REDIS_URL | ✅ Auto-configured (internal redis) | None |
| NODE_ENV | ✅ Hardcoded production | None |
| PORT | ✅ Hardcoded 3001 | None |
| JWT_SECRET | ⛔ NOT SET | **Run `openssl rand -base64 48` → paste into .env** |
| JWT_REFRESH_SECRET | ⛔ NOT SET | **Run `openssl rand -base64 48` → paste into .env** |
| WEB_URL | ⚠️ Default is localhost | Set to your domain in .env |
| NEXT_PUBLIC_API_URL | ⚠️ Default is localhost | Set to your API URL in .env |
| DB creation | ✅ Docker Compose handles it | None |
| Migrations | ✅ Auto-run in Dockerfile CMD | None |
| SMTP | ✅ Optional — safe to leave blank | Configure when ready |
| S3 | ✅ Optional — safe to leave blank | Configure when ready |
| First Owner bootstrap | ⏳ Pending | Run after deploy (Section 7) |
| E2E auth tests | ⏳ Pending | Run after deploy (Section 8) |

---

## Blockers

### Hard blockers (prevents deploy)

| # | Item | Action |
|---|------|--------|
| B1 | `.env` file does not exist at project root | Create it (see Section 2) |
| B2 | `JWT_SECRET` not set | `openssl rand -base64 48` |
| B3 | `JWT_REFRESH_SECRET` not set | `openssl rand -base64 48` |

### Soft blockers (prevents production-ready behavior)

| # | Item | Action |
|---|------|--------|
| S1 | `WEB_URL` defaults to localhost | Set to real domain for CORS to work across domains |
| S2 | `NEXT_PUBLIC_API_URL` defaults to localhost | Set to real API URL for frontend to call correct endpoint |

### Non-blocking (configure after launch)

| # | Item |
|---|------|
| N1 | SMTP — no email notifications until configured |
| N2 | S3/R2 — no file uploads until configured |
| N3 | Reverse proxy (Nginx/Caddy) — needed for HTTPS and clean URLs |
| N4 | GitHub Actions — no CI/CD pipeline yet |

---

## Next Action Required From You

**Do these 3 things in order:**

**Step 1** — Generate JWT secrets on your machine:
```bash
openssl rand -base64 48   # copy → paste as JWT_SECRET
openssl rand -base64 48   # copy → paste as JWT_REFRESH_SECRET
```

**Step 2** — Create `.env` at the project root with your values (see Section 2 template).

**Step 3** — On your VPS or local machine with Docker:
```bash
git pull
docker compose up -d --build
# Wait ~5 min for build
curl http://localhost:3001/api/health
# If {"status":"ok"} → run bootstrap (Section 7)
```

**Once health returns OK**, run the bootstrap command (Section 7) and then the E2E checklist (Section 8).

---

*This document was generated automatically. No real secrets were written to any file.*
