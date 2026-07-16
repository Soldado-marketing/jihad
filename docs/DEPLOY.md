# MAOS — Deployment Guide

## Prerequisites

- Docker + Docker Compose installed
- A PostgreSQL database (Railway, Supabase, or self-hosted)
- A domain name (optional for first launch)

---

## Option A — Docker Compose (VPS / Self-hosted)

### 1. Clone and configure environment

```bash
git clone <your-repo>
cd maos

# API environment
cp apps/api/.env.production.example apps/api/.env
nano apps/api/.env   # Fill in all values

# Root .env for docker-compose overrides
cp .env.example .env
nano .env
```

### 2. Generate JWT secrets

```bash
openssl rand -base64 48   # Use output as JWT_SECRET
openssl rand -base64 48   # Use output as JWT_REFRESH_SECRET
```

### 3. Build and start

```bash
docker compose up -d --build
```

### 4. Check health

```bash
curl http://localhost:3001/api/health
```

### 5. Bootstrap the first Owner account

```bash
curl -X POST http://localhost:3001/api/auth/bootstrap-owner \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@yourdomain.com",
    "password": "SecurePassword123!",
    "fullName": "Your Name",
    "tenantName": "Your Agency",
    "tenantSlug": "your-agency"
  }'
```

Save the returned token — this is the Owner account.

---

## Option B — Railway (Recommended for quick launch)

### API service

1. Create a new Railway project
2. Add a **PostgreSQL** service (Railway provides one free)
3. Add a new service → Deploy from GitHub → select `apps/api`
4. Set environment variables (copy from `.env.production.example`)
5. Set `DATABASE_URL` to Railway's auto-generated Postgres URL
6. Railway runs `prisma migrate deploy` automatically on startup via the Dockerfile CMD

### Web service

1. Add another service → Deploy from GitHub → select `apps/web`
2. Set `NEXT_PUBLIC_API_URL` to your API service's Railway URL

---

## Option C — Vercel (Web) + Railway (API)

- Deploy `apps/web` to Vercel → set `NEXT_PUBLIC_API_URL`
- Deploy `apps/api` to Railway → set all env vars
- Works well for teams already using Vercel

---

## Post-deploy Checklist

- [ ] `GET /api/health` returns 200
- [ ] Bootstrap owner created
- [ ] Login with owner account works
- [ ] Register a test user → appears in admin approval screen
- [ ] Approve test user → login works
- [ ] SMTP configured → test by inviting a user
- [ ] S3 configured → test file upload

---

## Updating / Redeploying

```bash
git pull
docker compose up -d --build
```

Migrations run automatically on every deploy. They are idempotent — safe to run on an already-migrated database.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32 chars, random |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars, random, different from JWT_SECRET |
| `REDIS_URL` | ✅ | Redis connection string |
| `WEB_URL` | ✅ | Frontend URL for CORS |
| `SMTP_HOST` | Recommended | For invites and notifications |
| `S3_BUCKET` | Recommended | For file uploads |
| `OPENAI_API_KEY` | Optional | For AI transcription features |
