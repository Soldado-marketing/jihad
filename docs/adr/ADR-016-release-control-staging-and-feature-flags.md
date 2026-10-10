# ADR-016: Release Control — Staging, Preview And Feature Flags

Status: Proposed

## Status

Proposed (MAOS-T14, 2026-10-09). Any Railway service, environment, domain or paid-plan change it recommends is an owner gate (decision D10 in `docs/MAOS_EXECUTION_LEDGER.md`).

## Context

Verified on 2026-10-09:

| Fact | Evidence |
|---|---|
| One deployment environment exists: production. | All 8 GitHub deployment records (2026-06-03 to 2026-10-05) and the only GitHub environment are `humorous-fulfillment / production`. |
| Merges to `main` deploy straight to production. | Railway services `jihad` (API, watch path `/apps/api/**`) and `maos-web` (web, `/apps/web/**`) deploy on push to `main`; PR #3 was merged at 12:41:17 UTC on 2026-10-05 and `df08135` was live on `jihad` by 12:42:50 UTC. |
| There is no staging, preview or UAT environment. | No other Railway or GitHub environment; no staging configuration in the repository. |
| There is no feature-flag mechanism. | No flag reads in `apps/api/src`, `apps/web/src` or `apps/web/app`. |
| Pre-merge validation is CI only. | `.github/workflows/ci.yml`: API typecheck/build, blocking unit gate, integration tests against a fresh PostgreSQL service, web typecheck/build/contract tests. |
| Real client data is not allowed yet. | REAL_CLIENT_DATA_ALLOWED = no. |

This contradicts earlier documentation. ADR-011 (Proposed) and `docs/devops/deployment-environment-strategy.md` describe a local → QA → staging/UAT → production promotion path and require staging before launch. That path was never built. This ADR records the gap and proposes the smallest safe way to close it; it does not silently amend ADR-011.

The upcoming roadmap raises the risk of production-only releases: migrations (Customer, TimeEntry, German invoice fields), authorization changes (contractor scope, session revocation) and new user-facing modules.

## Decision Options

| Option | What it gives | Cost / complexity | Risk it removes |
|---|---|---|---|
| A. CI only (today) | Fresh-database tests on every PR | None | Code-level regressions; not deployment, configuration or real-data-shape problems |
| B. Local production-like rehearsal | `docker-compose.yml` production build with a disposable database; migrations rehearsed against a restored copy of the latest verified dump | No hosting cost; manual step on the Mac | Migration failures on real data shape; production build/startup issues |
| C. Server-side feature flags | Unfinished user-facing features merged but hidden | Small code mechanism (environment variables read by the API, exposed to the web app through an authenticated endpoint) | Half-finished pages reaching users |
| D. Railway staging environment | A second, isolated environment (own PostgreSQL, API, web) with synthetic data, deployed before production | Extra Railway resources and cost (owner to confirm); production deploy trigger must change so staging is promoted first | Deployment, environment-variable and integration issues before production |
| E. Per-PR preview environments | One environment per pull request | Highest cost and moving parts; one database per PR | Same as D, per change |

## Recommendation

1. **Now, without owner cost:** adopt B as a mandatory step for every task that adds a migration or changes authentication/authorization. Each such task's DONE_WHEN includes "rehearsed on a restored copy of the latest verified dump in a disposable container". Depends on MAOS-T16 (restore rehearsal script).
2. **Before the first user-facing module of Phase A:** adopt C with the smallest mechanism (environment-variable flags, default off, read server-side only; no flag service, no database table).
3. **Owner decision D10 before the first production migration (gate G-DATA or the first W3 migration, whichever comes first):** decide on D, a single Railway staging environment with synthetic data only and its own database. Recommended, because migrations and authorization changes would otherwise be validated first on production.
4. **Not recommended now:** E (per-PR previews). The cost and moving parts are not justified at the current team size.

## Consequences

- ADR-011 and `docs/devops/deployment-environment-strategy.md` remain as historical intent; until D10 is decided, the effective path is local/CI → production with rehearsal B for high-risk changes.
- If D10 approves D: production must stop auto-deploying from `main` directly (a Railway configuration change, owner gate), and staging gets no production data.
- Feature flags (C) must never be used to hide security fixes, and flag state must not be client-controllable.

## Proposed follow-up tasks (to be registered in the execution ledger after review)

| Follow-up | Gate |
|---|---|
| Minimal server-side feature-flag mechanism (option C) | none (code only) |
| Railway staging environment with synthetic seed data (option D) | D10, OWNER_GATE_RAILWAY, OWNER_GATE_PAID_SERVICE |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Current deployment facts verified from evidence | Met |
| Contradiction with ADR-011 recorded, not silently overridden | Met |
| Options compared with cost and risk | Met |
| No Railway, domain, secret or plan change made | Met |
