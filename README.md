# MAOS — Soldado Marketing Platform

MAOS (Marketing Agency Operating System) is the internal platform of Soldado
Marketing: CRM, projects and tasks, files, approvals, a client portal,
invoices, payments and revenue, in one multi-tenant application.

## Stack

- **API** — NestJS 11, Prisma 6, PostgreSQL (`apps/api`)
- **Web** — Next.js 15, React 19 (`apps/web`)
- **Mail** — Resend HTTP API
- **Files** — private S3-compatible bucket
- **Hosting** — Railway

## Repository layout

```
apps/api/        NestJS API, Prisma schema and migrations, tests (test/*.test.mjs)
apps/web/        Next.js web app and client portal
scripts/         Database backup and restore scripts
docs/            Deployment guide, ADRs, standards; docs/archive/ holds superseded documents
.github/         CI workflow
CLAUDE.md        Working rules for AI coding agents
PROJECT_RULES.md Project rules
```

## Run locally

Requires Docker and Node.js. The repository lives at `~/Developer/claude`.

```bash
# 1. PostgreSQL and Redis
docker compose -f docker-compose.dev.yml up -d

# 2. API  (http://localhost:3001)
cd apps/api
cp .env.example .env          # then set JWT_SECRET and JWT_REFRESH_SECRET (32+ random chars)
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run dev

# 3. Web  (http://localhost:3000), in a second terminal
cd apps/web
npm ci
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev
```

Tests: `npm test` in `apps/api` or `apps/web`. The API integration suite is
described in [docs/DEPLOY.md](docs/DEPLOY.md#running-the-integration-tests-locally).

## Further reading

- [docs/DEPLOY.md](docs/DEPLOY.md) — deployment, environment variables, email, storage, migrations, backups, CI
- [CLAUDE.md](CLAUDE.md) — rules for AI coding agents working in this repository
