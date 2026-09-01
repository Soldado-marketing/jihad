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
curl -X POST http://localhost:3001/api/auth/bootstrap \
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
| `S3_BUCKET` | For files | Bucket name. See "Object storage" below. |
| `S3_REGION` | For files | e.g. `eu-central-1` |
| `S3_ACCESS_KEY_ID` | For files | Access key |
| `S3_SECRET_ACCESS_KEY` | For files | Secret key |
| `S3_ENDPOINT` | Optional | Custom endpoint for MinIO / R2 / Spaces |
| `S3_FORCE_PATH_STYLE` | Optional | Defaults to true when `S3_ENDPOINT` is set |
| `S3_KEY_PREFIX` | Optional | Namespace inside the bucket |
| `FILE_MAX_UPLOAD_BYTES` | Optional | Per-file limit, default 26214400 (25 MiB), max 104857600 |
| `OPENAI_API_KEY` | Optional | For AI transcription features |

---

## Object storage (required for file upload and download)

The API starts without object storage, but every upload and download route then
answers `503 STORAGE_NOT_CONFIGURED`. Storage is validated at startup: leaving
**all four** of `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID` and
`S3_SECRET_ACCESS_KEY` empty is accepted (with a warning), while setting only
some of them fails startup rather than failing later at upload time.

### AWS S3

```
S3_BUCKET=maos-files
S3_REGION=eu-central-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=
```

### MinIO or another S3-compatible provider

```
S3_BUCKET=maos-files
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://minio.example.com
S3_FORCE_PATH_STYLE=true
```

### Bucket policy

Keep the bucket **private**. The API never hands a bucket URL or an object key
to a browser: downloads are streamed through
`GET /api/files/:id/versions/:versionId/content` after authorisation. A public
bucket would bypass that check entirely.

Object keys are generated server-side and namespaced per tenant:

```
<S3_KEY_PREFIX>tenants/<tenantId>/files/<fileAssetId>/v<n>/<uuid><ext>
```

---

## Database migrations

Only ever run:

```bash
npx prisma migrate deploy
```

`prisma migrate dev` and `prisma db push` are **forbidden** in this project:
both can rewrite or drop migration history. Existing migration files are
append-only; never edit one that has already been applied.

---

## Backups

```bash
# Create a backup (keeps the newest 14 by default)
DATABASE_URL=postgresql://... ./scripts/backup-db.sh ./backups

# Keep more or fewer
BACKUP_RETENTION=30 DATABASE_URL=postgresql://... ./scripts/backup-db.sh ./backups
```

Each run writes `maos-<timestamp>.dump` plus a `.sha256` checksum, then prunes
older dumps by count. Only files matching its own naming scheme are ever pruned.

A nightly cron entry:

```
0 3 * * * cd /srv/maos && DATABASE_URL=postgresql://... ./scripts/backup-db.sh /srv/maos/backups >> /var/log/maos-backup.log 2>&1
```

### Restore

```bash
ADMIN_DATABASE_URL=postgresql://user:pass@host:5432/postgres   ./scripts/restore-db.sh ./backups/maos-20260901T030000Z.dump maos_restored
```

The restore script **never drops or overwrites an existing database**. It
verifies the checksum, refuses to run if the target name already exists, and
restores into a new database. Promoting that copy to production is a manual
step, on purpose:

1. Take a fresh backup of the current database.
2. Stop the API.
3. Repoint `DATABASE_URL` at the restored database and restart.

**Test a restore before you need one.** A backup you have never restored is a
hypothesis, not a backup.

---

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

| Job | Blocking | What it does |
|---|---|---|
| `api` | yes | `npm ci`, `prisma generate`, `prisma migrate deploy` against a real PostgreSQL 16 service, production typecheck, build, and the green test suites (162 tests) |
| `api` (integration) | yes | Boots the real app against the PostgreSQL service and drives it over HTTP (34 tests) |
| `api` (full suite) | no | Reports the 43 known failures without breaking the build |
| `web` | yes | Typecheck and build |
| `audit` | no | `npm audit --audit-level=high`, reporting only |

### Resolved in Phase 7: `npm ci` no longer needs `--legacy-peer-deps`

A plain `npm ci` used to fail on a clean checkout because `@nestjs/jwt@10` and
`@nestjs/passport@10` both declared a peer range of
`@nestjs/common ^8 || ^9 || ^10` while the project runs `@nestjs/common@11`.

Both were moved onto their NestJS 11 lines — `@nestjs/jwt@^11.0.2` and
`@nestjs/passport@^11.0.5` — and `bcrypt` was moved to `^6.0.0`, which ships
N-API prebuilds and therefore needs no local compilation on Node 24. The
workaround flag is gone from CI and must not be reinstated; if ERESOLVE returns,
fix the offending package instead.

One upgrade note: `@nestjs/jwt@11` types `signOptions.expiresIn` as the `ms`
`StringValue` template-literal union rather than a plain `string`. Since the
value comes from `JWT_EXPIRES_IN`, `apps/api/src/modules/auth/auth.module.ts`
casts that one field to `JwtSignOptions['expiresIn']`.

### A note on `NODE_ENV`

If `NODE_ENV=production` is exported in your shell, npm silently omits
`devDependencies` — the install appears to succeed but TypeScript type packages
are missing and the build fails with `Could not find a declaration file`. Run
installs with `NODE_ENV` unset or set to `development`.

### Why the typecheck step is scoped

`npm run typecheck` reports 152 errors, all inside legacy `*.spec.ts` files that
reference a `jest` runner which is not a dependency. The project's tests are
`node --test test/*.test.mjs`. CI therefore type-checks
`tsconfig.build.json`, which excludes those files and is green.

### Running the integration tests locally

```bash
docker compose -f docker-compose.dev.yml up -d postgres
```

Use a scratch database so your development data is left alone:

```bash
docker exec claude-postgres-1 psql -U maos -d postgres -c 'CREATE DATABASE maos_it'
```

```bash
cd apps/api
export DATABASE_URL='postgresql://maos:maos_password@127.0.0.1:5432/maos_it?schema=public'
export JWT_SECRET='<48+ random chars>'
npx prisma migrate deploy
npm run build
MAOS_INTEGRATION=1 node --test test/integration-api.test.mjs
```

The suite bootstraps the first Owner, so it needs a database with no Owner in
it. Re-running against the same database will fail at login; create a fresh one
each time.

