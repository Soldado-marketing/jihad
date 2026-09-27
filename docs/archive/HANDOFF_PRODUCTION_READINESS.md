# MAOS Platform — Production Readiness Handoff Report

**Date:** 2026-06-16
**Project root:** `/Users/jihadhilal/Documents/claude`
**Prepared by:** Stabilization audit (Claude)
**Status:** ✅ LOCAL MVP HANDOFF READY — ❌ NOT PRODUCTION READY

---

## 1. Executive Status

| Dimension | Status |
|---|---|
| Local Docker stack builds and runs | ✅ VERIFIED |
| Core registration → approval → login flow | ✅ VERIFIED LOCALLY |
| TypeScript compilation (API) | ✅ PASS — 0 errors |
| TypeScript compilation (Web) | ✅ PASS — 0 errors |
| All API paths use shared `apiBase()` helper | ✅ FIXED this session |
| Auth token key consistent across all pages | ✅ VERIFIED |
| SMTP email: crashes app if missing | ✅ NO — graceful warn + no-op |
| SMTP env vars in docker-compose | ✅ ADDED this session |
| Production DB migrations (proper baseline) | ❌ NOT DONE — see Section 7 |
| VPS / cloud deployment | ❌ NOT DONE |
| SMTP configured with real credentials | ❌ NOT DONE |
| Branding/placeholder text cleaned up | ❌ NOT DONE — see Section 10 |

---

## 2. What Works Locally

- `docker compose build api web` builds both images
- `docker compose up -d` starts postgres + redis + api + web
- `GET http://localhost:3001/api/health` → `{ "status": "ok" }`
- CORS preflight (`OPTIONS /api/auth/login` from `http://localhost:3000`) returns correct headers
- `POST /api/auth/bootstrap` — creates first OWNER tenant + user
- OWNER logs in at `http://localhost:3000/auth/login` — session stored in localStorage
- New user submits registration at `http://localhost:3000/auth/register`
- OWNER sees pending request in `/dashboard/admin/users/requests`
- OWNER can approve → user status → APPROVED, TenantMembership created
- OWNER can reject → user status → REJECTED
- Approved user can log in
- Rejected user gets `403` with clear message — no crash
- Email notification code present for all 3 events; safe no-op when SMTP not set
- All DB operations persist to PostgreSQL via Prisma

---

## 3. What Is NOT Production-Ready

1. **Database migrations not production-safe** — Local dev used `prisma db push` at some point. Production needs a proper baseline migration. See Section 7.
2. **SMTP not configured** — Email code is wired in but SMTP env vars have no real values. Emails will silently not send until configured.
3. **Secrets not set** — `JWT_SECRET`, `JWT_REFRESH_SECRET` must be replaced with strong random values. The dev `.env` file (not committed) likely has weak defaults.
4. **No HTTPS / reverse proxy** — API and web run on plain HTTP. Production needs nginx or Traefik with TLS termination.
5. **Branding not finalized** — UI still contains placeholder text (see Section 10).
6. **No rate limiting** — Registration and login endpoints have no brute-force protection in the current implementation.
7. **Redis not used yet** — Redis container is running but no code in the current scope uses it. It is reserved for session caching and queues in future sprints.
8. **No health check for web container** — Only the API has a Docker healthcheck. Consider adding one.

---

## 4. Local Run Commands

```bash
# From /Users/jihadhilal/Documents/claude

# First-time setup: create .env from example
cp .env.example .env    # then fill in JWT_SECRET, JWT_REFRESH_SECRET

# Build and start
docker compose build api web
docker compose up -d

# Verify
curl http://localhost:3001/api/health
# Expected: {"service":"maos-api","status":"ok"}

# Run migrations (if DB is empty or new)
# See Section 7 for production migration procedure

# Bootstrap first OWNER (only needed once, blocked after first use)
curl -X POST http://localhost:3001/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"tenantName":"My Company","tenantSlug":"my-company","fullName":"Admin","email":"admin@example.com","password":"StrongPass123"}'

# Open web UI
open http://localhost:3000
```

---

## 5. Required Environment Variables

All variables must be set in `.env` at the project root before running `docker compose up`.

### Required (no defaults — stack will fail without these)

| Variable | Description |
|---|---|
| `JWT_SECRET` | Random string ≥ 32 chars, e.g. `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Separate random string ≥ 32 chars |

### Optional with defaults

| Variable | Default | Description |
|---|---|---|
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `WEB_URL` | `http://localhost:3000` | Frontend origin for CORS |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API URL visible to browser |
| `APP_URL` | `http://localhost:3000` | Used in email links |

### Optional — SMTP (email notifications)

All blank by default. If any of `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` are missing, email is silently disabled with a startup warning logged. The app does NOT crash.

| Variable | Description |
|---|---|
| `SMTP_HOST` | e.g. `smtp.gmail.com` or `smtp.sendgrid.net` |
| `SMTP_PORT` | Default `587`; use `465` for SSL |
| `SMTP_USER` | SMTP username / API key username |
| `SMTP_PASS` | SMTP password / API key |
| `SMTP_FROM` | Sender address, e.g. `noreply@yourdomain.com` |

### Optional — future features (not used yet)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | For AI features (not active in current scope) |
| `S3_BUCKET` | File storage (not active in current scope) |
| `S3_REGION` | AWS region |
| `S3_ACCESS_KEY_ID` | AWS access key |
| `S3_SECRET_ACCESS_KEY` | AWS secret key |

---

## 6. SMTP Setup Requirements

When you are ready to enable email notifications:

1. Obtain SMTP credentials from your email provider (SendGrid, Postmark, Mailgun, Gmail SMTP, etc.)
2. Add to `.env`:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   SMTP_FROM=noreply@yourdomain.com
   APP_URL=https://yourdomain.com
   ```
3. Rebuild and restart the API container: `docker compose build api && docker compose up -d api`
4. On startup you will see: `[MailService] Mail service ready — SMTP smtp.sendgrid.net:587`
5. Without these vars: `[MailService] WARN Mail service not configured — ...` — this is safe, the app continues normally.

**Three emails are sent:**
- New registration request → tenant OWNER's email
- Approved request → requester's email (with login link)
- Rejected request → requester's email

---

## 7. ⚠️ Production Migration Warning

**This is a critical blocker for production deployment.**

The local development database may have been synchronized using `prisma db push` during early development. This approach does NOT generate migration files and is NOT safe for production.

**Before deploying to production:**

1. Verify the migration history is complete and clean:
   ```bash
   ls apps/api/prisma/migrations/
   ```
2. If migrations are missing or incomplete, create a baseline:
   ```bash
   # From inside the builder Docker image (has pinned prisma@6.19.3)
   docker build --target builder -t maos-api-migrator apps/api
   docker run --rm -it \
     -e DATABASE_URL="your-production-db-url" \
     maos-api-migrator \
     npx --no-install prisma migrate deploy
   ```
3. NEVER run `prisma db push` on production. It drops and recreates constraints without a migration history.
4. NEVER upgrade Prisma. The project is pinned to `6.19.3`. Upgrading will break the generated client.
5. The `run_migrations.sh` script at the project root is the safe migration runner for the local stack.

---

## 8. Deployment Checklist

Before going to production, complete ALL of the following:

- [ ] Generate strong JWT secrets: `openssl rand -hex 32`
- [ ] Set all required env vars on the server
- [ ] Verify migration history is complete (Section 7)
- [ ] Run `prisma migrate deploy` against the production database
- [ ] Configure nginx / Traefik with TLS for both port 3000 and 3001
- [ ] Point your domain DNS to the server
- [ ] Set `NEXT_PUBLIC_API_URL` to the public HTTPS API URL
- [ ] Set `WEB_URL` to the public HTTPS web URL
- [ ] Set `APP_URL` to the public HTTPS web URL (for email links)
- [ ] Configure SMTP and test email delivery
- [ ] Update CORS in `apps/api/src/main.ts` with your production domain instead of `localhost:3000`
- [ ] Add rate limiting middleware to login and register endpoints
- [ ] Enable PostgreSQL backups
- [ ] Review and remove placeholder branding (Section 10)
- [ ] Test the full registration → approval → login → rejection flow in production

---

## 9. Test Checklist — Verified Results

| # | Test | Result |
|---|---|---|
| 1 | `docker compose build api web` | ✅ PASS (local build) |
| 2 | `docker compose up -d` | ✅ PASS |
| 3 | `GET /api/health` | ✅ PASS — `{"status":"ok"}` |
| 4 | CORS preflight `OPTIONS /api/auth/login` from `localhost:3000` | ✅ PASS |
| 5 | `POST /api/auth/bootstrap` — creates first tenant + OWNER | ✅ PASS |
| 6 | OWNER login via browser | ✅ PASS — token stored as `maos_access_token` |
| 7 | New user registration request | ✅ PASS — request appears in DB |
| 8 | Admin requests page loads with `Authorization: Bearer <token>` | ✅ PASS |
| 9 | OWNER approves request | ✅ PASS — user status APPROVED, membership created |
| 10 | Approved user logs in | ✅ PASS |
| 11 | OWNER rejects request | ✅ PASS — user status REJECTED |
| 12 | Rejected user login attempt | ✅ PASS — `403` with message, no crash |
| 13 | MailService with no SMTP vars — no crash | ✅ PASS — logs WARN, continues |
| 14 | All frontend API calls use `apiBase()` helper | ✅ PASS (fixed this session) |
| 15 | Token key `maos_access_token` used consistently | ✅ PASS |
| 16 | No secrets logged to console | ✅ PASS — 0 matches found |
| 17 | API TypeScript compilation | ✅ PASS — 0 errors |
| 18 | Web TypeScript compilation | ✅ PASS — 0 errors |
| 19 | API Dockerfile: `prisma generate` in builder only | ✅ PASS |
| 20 | API Dockerfile: CMD is `node dist/main.js` | ✅ PASS |
| 21 | Web Dockerfile: no `.babelrc`, uses standalone output | ✅ PASS |
| 22 | `apps/web/public/` directory exists | ✅ PASS |
| 23 | SMTP env vars present in docker-compose (optional defaults) | ✅ ADDED this session |
| 24 | Docker build for VPS | ⏳ NOT RUN — requires active VPS |
| 25 | End-to-end test on staging/production server | ⏳ NOT RUN — no staging env |

---

## 10. Branding / Placeholder Cleanup List

The following UI text still contains placeholder or demo content that must be reviewed before customer-facing deployment. **No code changes were made to these items in this session.**

| Location | Current Text | Action Required |
|---|---|---|
| `apps/web/src/components/` | "Codex Marketing Platform" in sidebar/header | Replace with client brand name |
| Various dashboard pages | "Preview mode", "Local mode" banners | Remove or replace with real status |
| Various dashboard pages | "UI data is not persisted" warnings | Remove — data IS persisted now |
| Various dashboard pages | "Demo content" labels | Replace with real data or remove |
| `apps/web/app/` | "Staging not deployed" messages | Remove after staging is live |
| Login/Register pages | May still reference "Codex" in `<title>` tags | Update to client product name |

To find all occurrences:
```bash
grep -rn "Codex\|Preview mode\|Local mode\|Demo content\|not persisted\|Staging" \
  apps/web/app/ apps/web/src/ --include="*.tsx" --include="*.ts"
```

---

## 11. Known Technical Debt

1. **`(this.prisma as any)` casts** in auth.service.ts and admin-users.service.ts — Prisma client type generation was incomplete at build time. These casts are safe but should be removed once Prisma types are regenerated cleanly.
2. **No refresh token rotation endpoint** wired to the frontend — the backend `POST /api/auth/refresh` exists but the web app does not call it when the access token expires. Users will be logged out after 15 minutes.
3. **No logout button wired** — `clearAuthSession()` exists in `src/lib/auth.ts` but no UI element calls it.
4. **Redis is running but unused** — reserved for future session caching, rate limiting, and queue jobs.
5. **Rate limiting absent** — `/api/auth/login` and `/api/auth/register` accept unlimited requests.
6. **No email verification step** — registration goes directly to PENDING_APPROVAL with no email confirmation of the address.
7. **Prisma migration history** — needs verification before production deploy (see Section 7).
8. **Old root-level Next.js app** — `app/`, `components/`, `lib/`, `styles/` at project root are a legacy skeleton. They are protected and must not be modified, but they also should not be deployed. Confirm these are excluded from the web Docker build context.

---

## 12. Files Changed in This Stabilization Session

All work stayed inside `/Users/jihadhilal/Documents/claude`. No duplicate folders created.

**pwd verified:** `/sessions/tender-friendly-galileo/mnt/claude` (maps to `/Users/jihadhilal/Documents/claude`)

| File | Change | Reason |
|---|---|---|
| `apps/web/app/(auth)/auth/login/page.tsx` | **FIXED** — replaced local `apiBase` var with shared `apiBase()` import | Inconsistency: register and admin pages used the helper; login used a raw inline variable. If `NEXT_PUBLIC_API_URL` was set without `/api`, login would silently call the wrong URL. |
| `docker-compose.yml` | **ADDED** — 6 SMTP env vars with empty defaults under `api` service | Without these, the developer cannot enable email by simply setting env vars; they would have had to edit docker-compose manually. |
| `apps/api/src/modules/mail/mail.service.ts` | **CREATED** (previous session) | MailService for nodemailer-based email notifications |
| `apps/api/src/modules/mail/mail.module.ts` | **CREATED** (previous session) | @Global NestJS module wrapping MailService |
| `apps/api/src/app.module.ts` | **MODIFIED** (previous session) | Added MailModule import |
| `apps/api/src/modules/auth/auth.service.ts` | **MODIFIED** (previous session) | Injected MailService; owner notification after register() |
| `apps/api/src/modules/admin-users/admin-users.service.ts` | **MODIFIED** (previous session) | Injected MailService; approval and rejection emails |
| `apps/api/package.json` + `package-lock.json` | **MODIFIED** (previous session) | Added nodemailer + @types/nodemailer |
| `HANDOFF_PRODUCTION_READINESS.md` | **CREATED** (this session) | This document |

---

## 13. Next Steps for the Developer

**Immediate (before any production deploy):**

1. `cd /Users/jihadhilal/Documents/claude`
2. Copy and fill env: `cp .env.example .env` — set `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong random values
3. Verify migration files are complete: `ls apps/api/prisma/migrations/`
4. Run local stack: `docker compose build api web && docker compose up -d`
5. Bootstrap the OWNER account (once): see Section 4
6. Test the full flow manually: register → approve → login → reject

**Before customer demo:**

7. Replace all placeholder branding (Section 10)
8. Configure SMTP and test email delivery (Section 6)

**Before production launch:**

9. Set up VPS with Docker + nginx + TLS
10. Set all production env vars (Section 5)
11. Run `prisma migrate deploy` against the production database (Section 7)
12. Update CORS in `apps/api/src/main.ts` with the production domain
13. Add rate limiting to login + register routes
14. Complete remaining items in the deployment checklist (Section 8)

---

## 14. Future UI / Branding Vision

### Neural Hub Preview

A futuristic, isolated RTL Arabic dashboard prototype is available at:

**Route:** `http://localhost:3000/dashboard/neural-hub-preview`
**Files:**
- `apps/web/app/(workspace)/dashboard/neural-hub-preview/page.tsx` — server route (ssr: false wrapper)
- `apps/web/src/components/neural-hub/NeuralHubPreview.tsx` — client component
- `apps/web/src/components/neural-hub/neural-hub.module.css` — scoped neon/cyber styles

**Key details:**
- All data is **static only** — no backend API calls, no database queries.
- The 3D globe is built with Three.js (installed as `three@0.184.0` in `apps/web`). It initialises inside `useEffect` and is fully cleaned up on unmount.
- The page uses Arabic RTL layout (`dir="rtl"`) and is **not** the active production dashboard.
- A visible yellow "Neural Hub Preview — Prototype" banner is displayed at the top at all times.
- This route is **completely isolated** — it does not replace `/dashboard`, does not touch auth/admin/API/Prisma/Docker files.

**Before connecting to production data**, the following must be done:
1. Replace static data arrays with real API calls.
2. Add proper auth guard (route currently loads for any authenticated user in the workspace layout).
3. Connect the voice command bar to an actual speech recognition / LLM backend.
4. Replace the static emotion value with real sentiment analysis data.

---

## 15. Branding Cleanup Status

Placeholder branding was partially cleaned up during the local MVP handoff session. The following changes were applied to frontend UI text only — no backend, auth, Docker, Prisma, or API files were touched.

| Location | Old Text | New Text |
|---|---|---|
| `apps/web/src/components/shell/topbar.tsx` | `Codex Marketing Platform` | `Soldado Marketing Platform` |
| `apps/web/src/components/shell/topbar-actions.tsx` | `Preview mode` | `Local MVP` |
| `apps/web/src/components/shell/user-menu.tsx` | `MAOS User` | `Account` |
| `apps/web/src/components/shell/user-menu.tsx` | `Local preview account` / Railway reference | `Workspace account` / generic API reference |
| `apps/web/src/components/shell/sidebar.tsx` | `Marketing Agency OS` | `Soldado Platform` |
| `apps/web/app/layout.tsx` | `Codex Marketing Platform workspace preview for MAOS.` | `Soldado Marketing Platform — Local MVP workspace.` |
| `apps/web/app/(workspace)/dashboard/page.tsx` | `Local mode: UI data is not persisted.` | `Local MVP: Data is not persisted in this mode.` |
| `apps/web/app/(workspace)/dashboard/page.tsx` | Description referencing Railway staging environment | Generic production/API reference |
| `apps/web/src/components/dashboard/workspace-command-center.tsx` | `Railway staging pending` | `Production deployment pending` |
| `apps/web/src/components/dashboard/workspace-command-center.tsx` | `confirm Railway environment values` | `confirm environment variables` |
| `apps/web/src/components/dashboard/workspace-command-center.tsx` | `Staging not deployed` | `Production pending` |
| `apps/web/app/(workspace)/approvals/[id]/page.tsx` | `Homepage copy approval` | `Demo Approval Page` |
| `apps/web/app/(workspace)/approvals/page.tsx` | `Homepage copy review` / `Client portal preview approval` | `[Demo] Homepage copy review` / `[Demo] Client portal preview` |

**What was NOT changed (intentional):**
- MAOS kept as product/system name in the sidebar logo and dashboard eyebrow — this is the system name, not a placeholder
- No route paths were changed
- No backend, auth, Docker, Prisma, or email files were touched

**What the developer must still do before production:**
- Final brand copy and design must be reviewed and approved by the client before production launch
- The `[Demo]` prefix on approval items should be replaced with real approval workflow items once persistence is connected
- The sidebar logo icon (`M`) and MAOS system name should be reviewed for final client branding
- `apps/web/app/(workspace)/tasks/page.tsx` still contains a local-mode reference in its description — review before production

---

## Final Verdict

**Status: LOCAL MVP HANDOFF READY — NOT PRODUCTION READY**

The core registration → approval → login flow works end-to-end on the local Docker stack. All API paths are consistent, TypeScript is clean, email sending degrades gracefully when SMTP is not configured, and both Dockerfiles are correct. Two bugs were fixed in this session (login page API path helper, missing SMTP docker-compose vars).

The project is ready to hand off to a developer for continued work. Production deployment requires the items listed in Sections 7, 8, and 10 to be completed first.
