# SPRINT 13 — VPS Docker Compose Deploy Commands

**Status: VPS DEPLOY COMMANDS READY**
**Target:** Docker Compose on VPS (Hostinger / Hetzner / DigitalOcean / any Linux server)
**Date:** 2026-06-13

---

## Step 1 — Generate JWT Secrets

Run these two commands on your local machine or directly on the server.
Each command produces a different random string — use them separately.

```bash
# Generate JWT_SECRET
openssl rand -base64 48

# Generate JWT_REFRESH_SECRET (run again — must be a DIFFERENT value)
openssl rand -base64 48
```

Copy each output value. You will paste them into the `.env` file in the next step.

---

## Step 2 — Create the Root `.env` File

Create this file at the **project root** (same folder as `docker-compose.yml`).

### Option A — Create via terminal (paste and edit)

```bash
nano .env
```

### Option B — Create via heredoc (replace placeholders first)

```bash
cat > .env << 'EOF'
JWT_SECRET=REPLACE_WITH_FIRST_OPENSSL_OUTPUT
JWT_REFRESH_SECRET=REPLACE_WITH_SECOND_OPENSSL_OUTPUT
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
WEB_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
EOF
```

### Full `.env` template (copy this, fill in your values)

```dotenv
# ── MAOS Production — Root .env for docker-compose ──────────────────────────
# Place this file at the project root, next to docker-compose.yml
# NEVER commit this file to git (.gitignore already excludes .env)

# ── JWT Secrets ───────────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 48
# Must be at least 32 chars. Both values must be DIFFERENT from each other.
JWT_SECRET=REPLACE_WITH_FIRST_OPENSSL_OUTPUT
JWT_REFRESH_SECRET=REPLACE_WITH_SECOND_OPENSSL_OUTPUT
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── URLs ──────────────────────────────────────────────────────────────────────
# WEB_URL      = your public frontend domain (used for CORS on the API)
# NEXT_PUBLIC_API_URL = what the browser uses to call the API
# If no domain yet, use: http://YOUR_SERVER_IP:3001
WEB_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# ── SMTP (optional — leave blank to disable email) ───────────────────────────
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# ── S3 / Cloudflare R2 (optional — leave blank to disable file uploads) ───────
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=

# ── OpenAI (optional — leave blank to disable AI features) ───────────────────
OPENAI_API_KEY=

# NOTE: DATABASE_URL and REDIS_URL are NOT needed here.
# docker-compose.yml sets them automatically to the internal postgres and redis services.
```

### Verify the file was created

```bash
cat .env
# Confirm JWT_SECRET and JWT_REFRESH_SECRET are filled in.
# Confirm no real secrets are visible in your terminal history (they are in the file, that is fine).
```

---

## Step 3 — Deploy

### Pull latest code (if on server)

```bash
git pull origin main
```

### Build and start all services

```bash
docker compose up -d --build
```

This single command:
1. Builds the API Docker image (NestJS multi-stage build, ~3–5 min)
2. Builds the Web Docker image (Next.js standalone build, ~2–4 min)
3. Starts `postgres` container and waits for health check
4. Starts `redis` container and waits for health check
5. Starts `api` container — automatically runs `prisma migrate deploy` then `node dist/main.js`
6. Starts `web` container

Expected total time: **5–10 minutes** on first build.
Subsequent deploys (code change only): **2–4 minutes** (layer cache reused).

---

## Step 4 — Verify Services

### Check container status

```bash
docker compose ps
```

Expected output:

```
NAME                STATUS              PORTS
maos-postgres-1     running (healthy)   0.0.0.0:5432->5432/tcp
maos-redis-1        running (healthy)   0.0.0.0:6379->6379/tcp
maos-api-1          running             0.0.0.0:3001->3001/tcp
maos-web-1          running             0.0.0.0:3000->3000/tcp
```

All four containers must show `running`. Postgres and Redis must show `(healthy)`.

### Watch API logs

```bash
docker compose logs -f api
```

Look for this line — it means the API started successfully:

```
[NestFactory] Starting Nest application...
[NestApplication] Nest application successfully started
Application is running on: http://[::1]:3001
```

Also look for migration output near startup:

```
Applying migration `20240101000000_add_password_hash`
Applying migration `20260612000000_add_public_registration_approval`
All migrations have been successfully applied.
```

Press `Ctrl+C` to stop following logs (containers keep running).

### Watch Web logs

```bash
docker compose logs -f web
```

Look for:

```
Ready - started server on 0.0.0.0:3000
```

### API health check

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{"status":"ok"}
```

If your server has a domain with reverse proxy:

```bash
curl https://yourdomain.com/api/health
```

---

## Step 5 — Bootstrap First Owner (one-time only)

Run this **once** after the API is healthy. Replace every placeholder with your real values.

```bash
curl -X POST http://localhost:3001/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@yourdomain.com",
    "password": "YourSecurePassword123!",
    "fullName": "Your Full Name",
    "tenantName": "Your Agency Name",
    "tenantSlug": "your-agency"
  }'
```

With domain:

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

**Expected response (HTTP 201):**

```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "user": {
    "id": "...",
    "email": "owner@yourdomain.com",
    "role": "OWNER",
    "status": "APPROVED"
  }
}
```

**Save the `access_token`** — you need it for admin commands below.

Bootstrap locks itself after this call. Any second call returns `403 Forbidden`.

---

## Step 6 — Post-Deploy Auth Test Commands

Run these in order. Replace `BASE_URL`, `YOUR-SLUG`, and `OWNER_TOKEN` with your actual values.

Set your base URL once:

```bash
BASE_URL=http://localhost:3001
# or: BASE_URL=https://yourdomain.com
SLUG=your-agency
```

---

### Test 1 — Second bootstrap must fail

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST $BASE_URL/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"second@test.com","password":"Test123!","fullName":"Test","tenantName":"Test","tenantSlug":"test"}'
# Expected: 403
```

---

### Test 2 — Public registration

```bash
curl -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "testuser@example.com",
    "password": "TestPass123!",
    "requestedAccountType": "team_member",
    "tenantSlug": "'$SLUG'"
  }'
# Expected: 201 {"message":"Your account request was received..."}
```

---

### Test 3 — Pending user login must be blocked

```bash
curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123!",
    "tenantSlug": "'$SLUG'"
  }'
# Expected: 403 with message about pending approval (not a JWT token)
```

---

### Test 4 — Owner login (get token)

```bash
curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@yourdomain.com",
    "password": "YourSecurePassword123!",
    "tenantSlug": "'$SLUG'"
  }'
# Expected: 200 with access_token
```

Copy the `access_token` value, then:

```bash
OWNER_TOKEN=eyJhbGci...PASTE_YOUR_TOKEN_HERE
```

---

### Test 5 — List pending registration requests

```bash
curl -s $BASE_URL/api/admin/users/requests \
  -H "Authorization: Bearer $OWNER_TOKEN"
# Expected: 200 with array containing testuser@example.com with status PENDING
```

Copy the `id` of the first result, then:

```bash
REQUEST_ID=PASTE_REQUEST_ID_HERE
```

---

### Test 6 — Approve the pending user

```bash
curl -s -X POST $BASE_URL/api/admin/users/requests/$REQUEST_ID/approve \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "EMPLOYEE",
    "visibilityScope": "ASSIGNED_ITEMS_ONLY"
  }'
# Expected: 200 with success message
```

---

### Test 7 — Approved user login must now succeed

```bash
curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123!",
    "tenantSlug": "'$SLUG'"
  }'
# Expected: 200 with access_token (not 403)
```

---

### Test 8 — Non-owner cannot reach admin endpoints

```bash
USER_TOKEN=PASTE_APPROVED_USER_TOKEN_HERE

curl -s -o /dev/null -w "%{http_code}" \
  $BASE_URL/api/admin/users/requests \
  -H "Authorization: Bearer $USER_TOKEN"
# Expected: 403
```

---

## Step 7 — Troubleshooting

### API container not starting

```bash
docker compose logs api --tail=50
```

Common causes and fixes:

| Symptom in logs | Cause | Fix |
|-----------------|-------|-----|
| `JWT_SECRET must be set` or similar | `.env` file not found or JWT vars empty | Check `.env` exists at project root, check vars are filled |
| `ECONNREFUSED postgres:5432` | Postgres not healthy yet | Wait 30s and retry. Check `docker compose ps` — postgres must show `(healthy)` |
| `Cannot find module` | Build failed | Run `docker compose build api` separately and read build output |
| `prisma migrate deploy` error | DB connection issue | Check postgres is healthy. Run `docker compose logs postgres` |

---

### Migration fails

```bash
docker compose logs api | grep -i "migration\|prisma\|error"
```

Common causes:

| Error | Fix |
|-------|-----|
| `P1001: Can't reach database server` | Postgres not ready. Add `sleep 5` before retrying, or check healthcheck |
| `P3009: migrate found failed migrations` | A previous partial migration left the DB in a broken state. Connect to DB and run `SELECT * FROM "_prisma_migrations"` to inspect |
| `relation already exists` | Migration was partially applied. Safe to check `_prisma_migrations` and mark failed row as rolled back |

Manual migration run (for debugging):

```bash
docker compose exec api npx prisma migrate deploy
```

---

### Web cannot reach API

Symptom: frontend loads but API calls fail (network error, CORS error).

```bash
# Check NEXT_PUBLIC_API_URL is set correctly
docker compose exec web env | grep NEXT_PUBLIC
```

Common causes:

| Cause | Fix |
|-------|-----|
| `NEXT_PUBLIC_API_URL` still points to `localhost` | Update `.env` to your real domain or server IP, rebuild web: `docker compose up -d --build web` |
| CORS blocked | Update `WEB_URL` in `.env` to match your frontend domain exactly (including `https://`), rebuild api |
| Reverse proxy not forwarding `/api` | Ensure Nginx/Caddy proxies `/api` to port `3001` |

---

### Health check fails

```bash
curl -v http://localhost:3001/api/health
```

Common causes:

| Symptom | Fix |
|---------|-----|
| `Connection refused` | API container not running. Check `docker compose ps` and `docker compose logs api` |
| `502 Bad Gateway` | Reverse proxy running but API not started yet. Wait 30s and retry |
| `404 Not Found` | Wrong URL path. Route is `/api/health` not `/health` |

---

### Login or register returns unexpected errors

```bash
# Check API logs in real time while making the request
docker compose logs -f api
# (in another terminal)
curl -X POST http://localhost:3001/api/auth/login ...
```

Common causes:

| Error | Fix |
|-------|-----|
| `401 Unauthorized` on login | Wrong password or user does not exist |
| `403 Forbidden` on login | User status is `PENDING_APPROVAL`, `REJECTED`, or `SUSPENDED` |
| `400 Bad Request` | Missing required field in request body. Check JSON payload |
| `500 Internal Server Error` | Database issue. Check `docker compose logs api` for the stack trace |

---

## Redeploy After a Code Change

```bash
git pull origin main
docker compose up -d --build
# Migrations run automatically on API container restart
```

---

## Stop All Services

```bash
docker compose down
# Volumes (postgres data) are preserved

# To also remove volumes (WARNING: deletes all data):
docker compose down -v
```

---

## Quick Reference

```bash
# Start
docker compose up -d --build

# Status
docker compose ps

# API logs
docker compose logs -f api

# Web logs
docker compose logs -f web

# Health
curl http://localhost:3001/api/health

# Bootstrap (one-time)
curl -X POST http://localhost:3001/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"OWNER_EMAIL","password":"PASSWORD","fullName":"NAME","tenantName":"AGENCY","tenantSlug":"SLUG"}'

# Stop
docker compose down
```

---

*VPS DEPLOY COMMANDS READY — No code changes. No real secrets. Docker Compose only.*
