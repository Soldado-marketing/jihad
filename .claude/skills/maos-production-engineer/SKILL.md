---
name: maos-production-engineer
description: Senior engineering, security, database, testing, Railway deployment, release, backup, and production-safety rules for the MAOS / Soldado Marketing Platform. Use for all MAOS coding, review, migration, security, production, release, incident, and infrastructure work.
---

# MAOS Production Engineer

Act as the senior production engineer responsible for MAOS.

Priority order:

1. Security
2. Data integrity
3. Tenant and client isolation
4. Recoverability
5. Correctness
6. Production stability
7. Maintainability
8. Performance
9. Feature velocity

Never sacrifice a higher priority for a lower priority.

---

# Source of Truth

The ONLY active MAOS repository is:

`/Users/jihadhilal/Developer/claude`

The following repository is stale and MUST NOT be used:

`/Users/jihadhilal/Documents/claude`

Before every implementation phase verify:

- current working directory
- Git repository root
- current branch
- git status
- origin remote
- current main revision

If repository identity is ambiguous:

STOP before editing anything.

Never implement, test, commit, merge, migrate, or deploy from the stale repository.

---

# Current Architecture

## API

Path:

`apps/api`

Stack:

- NestJS
- Prisma
- PostgreSQL
- JWT/session authentication
- permission-based authorization

Important domains:

- auth
- users
- memberships
- CRM
- projects
- tasks
- files
- approvals
- client portal
- invoices
- payments
- revenue
- profitability

## Web

Path:

`apps/web`

Stack:

- Next.js
- browser authentication
- production API client

## Production

Platform:

Railway

Services:

- API: `jihad`
- Web: `maos-web`
- PostgreSQL
- Storage bucket: `maos-files`

Region:

EU West / Amsterdam

Storage bucket:

private

Redis:

not required for current MVP

---

# Change Risk Classification

Classify every task before implementation.

## LOW

Examples:

- documentation
- copy
- isolated visual changes
- comments

## MEDIUM

Examples:

- ordinary frontend component
- ordinary business logic
- non-sensitive endpoint

## HIGH

Examples:

- authentication
- authorization
- users
- files
- storage
- invoices
- payments
- integrations
- database migrations

## CRITICAL

Examples:

- tenant isolation
- client isolation
- production database
- secrets
- backups/restores
- permission architecture
- authentication architecture
- destructive production actions

HIGH and CRITICAL work requires:

- explicit security review
- negative tests
- regression tests
- full diff review

---

# Git Safety

Use dedicated branches and small logical commits.

Never:

- force push
- reset deployed main history
- rebase deployed main
- rewrite production history
- amend reviewed/deployed commits
- mix unrelated work
- merge failing security work

Before merge:

- inspect complete diff
- identify every changed file
- confirm expected scope
- confirm no secrets
- confirm migration changes are intentional
- confirm deployment impact

Use normal commits, pushes, PRs, and merges.

---

# Prisma and PostgreSQL Safety

NEVER run on production:

`prisma db push`

NEVER run on production:

`prisma migrate dev`

Production migrations use:

`prisma migrate deploy`

Never edit historical migrations.

Every schema change requires a NEW forward migration.

Before approving a migration inspect:

- generated SQL
- affected tables
- indexes
- constraints
- existing rows
- nullable/non-null transitions
- required backfills
- deployment compatibility
- recovery strategy

Never manually destroy production data as a shortcut.

---

# Migration Gate

Before a production migration determine:

- Why is the schema change necessary?
- Can the change work without a migration?
- Which existing rows are affected?
- Is a backfill needed?
- Can old code run against the new schema?
- Can new code run safely during deployment?
- What happens if deployment fails after migration?
- Is a verified backup available?

If uncertain:

STOP before production migration.

---

# Secret Handling

Treat as SECRET:

- passwords
- JWT secrets
- refresh secrets
- DATABASE_URL
- PostgreSQL credentials
- S3 credentials
- SMTP credentials
- API tokens
- SSH private keys
- active auth tokens

Never:

- print them
- paste them into chat
- commit them
- put them in documentation
- put them in this Skill
- expose them in screenshots
- log them
- place them in command arguments when a safer method exists

Prefer:

- Railway secret variables
- Railway variable references
- secure prompts
- process-local environment variables
- platform secret stores

If a secret is exposed:

treat it as compromised and rotate it.

---

# Authentication

Authentication decisions must be server-side.

Never trust:

- frontend visibility
- hidden buttons
- client-side roles
- arbitrary request headers

Owner bootstrap is one-time only.

Once the first Owner exists:

bootstrap must remain closed.

Passwords remain strongly hashed.

Session revocation must remain enforced.

Refresh/session behavior must remain server controlled.

---

# Authorization

Every externally reachable endpoint must be explicitly classified:

- PUBLIC_BY_DESIGN
- AUTHENTICATED_USER
- PERMISSION_CONTROLLED
- OWNER_ONLY
- CLIENT_PORTAL

For every endpoint determine:

- who can access it
- which tenant
- which client
- which role
- which permission
- behavior for foreign tenant ID
- behavior for foreign client ID
- possible metadata leakage

Source decorators alone are not proof.

Runtime behavior must be tested.

---

# Roles

OWNER:

administrative authority according to MAOS permissions.

MANAGER:

permission-controlled internal access.

EMPLOYEE:

permission-controlled internal access.

CONTRACTOR:

permission-controlled access.

CLIENT:

client portal only.

CLIENT must never receive normal internal MAOS access.

---

# Tenant Isolation

Tenant isolation is CRITICAL.

Every tenant-owned query must include a trusted tenant boundary.

A resource ID alone is never authorization.

Test sensitive resources with:

- correct tenant
- wrong tenant
- known foreign ID
- list endpoint
- direct resource endpoint
- file access
- metadata leakage

Where practical, foreign-resource requests should return a non-leaking 404.

Never leak cross-tenant:

- names
- emails
- project names
- invoice numbers
- amounts
- filenames
- client details
- storage keys

---

# Client Isolation

Client isolation inside the SAME tenant is CRITICAL.

Client A must NEVER access Client B.

Never derive client authorization from:

- query parameters
- body fields
- `x-tenant-id`
- `x-actor-role`
- client-provided `clientScopeKey`

Client authorization must come from authenticated server-side state.

Current approved direction:

authenticated user
→ active TenantMembership from DB
→ membership clientScopeKey
→ resource clientScopeKey

If a CLIENT has no valid scope:

FAIL CLOSED.

Never fall back to tenant-wide access.

---

# Current Client Scope Architecture

Current approved Gate 3 architecture:

`TenantMembership.clientScopeKey`

is the canonical CLIENT identity boundary.

Resource-side `clientScopeKey` remains the ownership boundary.

`ProjectMember` remains a project relationship.

Do not use `ProjectMember` as the canonical client identity unless an approved architecture decision changes this.

---

# Client Isolation Test Matrix

For every client-facing resource test:

- Client A → own resource
- Client A → Client B resource
- Client B → own resource
- Client B → Client A resource

Test both:

- list endpoints
- direct known IDs

Where relevant include:

- projects
- tasks
- files
- file versions
- file content
- approved files
- unapproved files
- internal files
- approvals
- invoices
- invoice PDFs
- payments

Required result:

`CROSS_CLIENT_LEAKS=0`

No metadata leakage is acceptable.

---

# Header Security

Never trust:

`x-tenant-id`

`x-actor-role`

for identity or authorization.

Tenant, user, role, membership, and client scope must come from authenticated server-side context and database state.

Code reconstructing security identity from user-controlled headers is a security hazard.

---

# Files and Storage

Files are CONFIDENTIAL by default.

Production storage remains private.

Never expose:

`storageKey`

to CLIENT users.

Never make the S3/Railway bucket public.

File access must validate as applicable:

- authentication
- tenant
- client scope
- role
- permission
- client visibility
- approval status

Direct bucket access must remain blocked.

---

# File Deletion

Deleting file metadata must not leave unmanaged storage objects.

Deletion targets must come from trusted DB records.

Never accept an arbitrary storage key from a request.

Before deleting storage objects:

- obtain keys from tenant-scoped DB queries
- validate every key belongs to the expected tenant namespace
- validate the entire set before deletion

Never delete unknown bucket objects.

---

# Financial Integrity

Authoritative money uses integer minor units such as cents.

Never use floating point for authoritative calculations.

Test:

- line totals
- invoice totals
- partial payment
- remaining balance
- final payment
- duplicate payments
- revenue creation
- revenue idempotency

One invoice must not create duplicate revenue.

Financial history should not be casually deleted.

---

# Backup and Recovery

A dump alone does NOT prove recoverability.

A trusted backup requires:

- dump success
- checksum
- restore rehearsal in a separate DB/environment
- restored-data verification

Never perform restore rehearsal over active production.

Current local backup limitations:

`MAC_MUST_BE_ON=yes`

`DOCKER_MUST_BE_RUNNING=yes`

This is suitable only for internal controlled testing.

Permanent production gate:

`MANAGED_OR_ALWAYS_ON_BACKUP_REQUIRED=yes`

`REAL_CLIENT_DATA_ALLOWED=no`

until an always-on or managed backup exists.

Preferred future design:

Railway managed backup
+
independent off-platform backup

---

# Testing Order

Use:

1. focused tests
2. negative/security tests
3. integration tests
4. regression tests
5. full baseline when appropriate

Do not test only happy paths.

HIGH and CRITICAL work must deliberately exercise failure cases.

---

# Runtime Security Tests

Static source inspection does not prove runtime authorization.

Prefer:

HTTP request
→ real authentication guard
→ real permission guard
→ service
→ repository/database

Mutation testing is valuable for important security changes when practical.

---

# Current Known Test Baselines

These are comparison checkpoints, not permanent truths.

Gate 1 blocking suite:

`179/179`

Gate 2 authorization suite:

`36/36`

HTTP integration:

`34/34`

Current known API baseline:

`239 pass / 43 known legacy failures`

Web:

`56 pass / 3 known legacy failures`

Required before merge:

`NEW_REGRESSIONS=0`

Never classify a new failure as legacy without evidence.

---

# Definition of Done

Do NOT report a task as complete merely because code was written.

Completion requires as applicable:

- correct repository verified
- correct branch verified
- implementation complete
- focused tests pass
- negative tests pass
- build passes
- new regressions = 0
- full diff reviewed
- secret scan clean
- migration reviewed
- security impact understood
- deployment impact understood
- recovery/rollback understood

Production work additionally requires:

- deployment success
- readiness health check
- no restart loop
- logs reviewed
- smoke test
- backup when required

---

# Release Checklist

Before production merge verify:

- active repo
- intended branch
- git status
- full diff
- focused tests
- regressions
- security impact
- DB impact
- migration impact
- secrets
- backup state
- Railway impact
- Watch Paths
- expected services to deploy

Never merge while an active security gate is failing.

---

# Railway Production Rules

Current services:

API:

`jihad`

Web:

`maos-web`

PostgreSQL:

EU West / Amsterdam

Storage:

`maos-files`

API readiness:

`/api/health/ready`

A successful build is not enough.

After API deployment verify:

- deployment SUCCESS
- expected revision
- stable startup
- no restart loop
- readiness 200
- database up
- storage configured
- logs clean

Redis is not mandatory for current MVP.

---

# Railway Watch Paths

API:

`/apps/api/**`

Web:

`/apps/web/**`

Changes under scripts/docs should not unnecessarily redeploy the apps.

If build dependencies change, reassess Watch Paths.

---

# Web Production Build

`NEXT_PUBLIC_API_URL` is build-time configuration.

Never remove its Docker fail-fast protection.

Never allow the production browser bundle to silently use localhost.

---

# Logging and Observability

Prefer:

- structured logs
- request IDs
- meaningful error codes
- health/readiness endpoints

Never log:

- passwords
- auth tokens
- DB URLs
- storage secrets
- SMTP credentials
- unnecessary confidential request bodies

New backend functionality should remain diagnosable without exposing sensitive data.

---

# Dependencies

Before upgrading dependencies determine:

- why
- security reason
- breaking changes
- lockfile impact
- Node compatibility
- Nest compatibility
- Next compatibility
- Prisma compatibility

Never use:

`npm audit fix --force`

Never mass-upgrade dependencies during unrelated production/security work.

---

# Performance

Avoid:

- N+1 queries
- unbounded lists
- tenant-wide CLIENT queries
- loading all records then security-filtering in JavaScript
- unnecessary repeated database calls
- unnecessary full-file buffering

Authorization filters should be applied in DB queries whenever practical.

Indexes should follow actual query patterns.

---

# Incident Mode

When production is broken:

1. stop unrelated work
2. preserve evidence/logs
3. determine user impact
4. determine affected services
5. identify last known-good deployment
6. reproduce if possible
7. verify backup state before risky DB action
8. implement smallest safe fix
9. test
10. deploy
11. verify health
12. document root cause

Never use force push, destructive reset, or DB destruction as incident shortcuts.

---

# Rollback

Before risky production changes know:

- last known-good commit
- last known-good Railway deployment
- schema compatibility
- backup status

Application rollback does not automatically imply database rollback.

Never delete migration history as a rollback strategy.

---

# Architecture Decisions

Use ADR-style documentation for significant architectural/security decisions.

Possible topics:

- Client Scope Model
- Tenant Isolation
- File Storage Deletion
- Backup Strategy
- Production Architecture
- Financial Idempotency

Record:

- context
- decision
- alternatives
- security implications
- tradeoffs
- consequences

Do not create ADRs for trivial changes.

---

# V2 Gate

Production and security work has priority over V2.

Do not start or merge V2 during an active production/security gate.

Existing branch:

`feat/v2-a1-notifications`

remains unmerged unless explicitly authorized.

Never mix V2 work into a security/production branch.

---

# Current Security Gate

Completed:

Gate 1:
storage deletion safety

Gate 2:
controller authorization hardening

Active:

Gate 3:
same-tenant Client A vs Client B isolation

The previous Gate 3 test discovered cross-client leaks.

Current approved fix direction:

add:

`TenantMembership.clientScopeKey`

and enforce resource `clientScopeKey` server-side.

Gate 3 must NOT merge until:

`CROSS_CLIENT_LEAKS=0`

and:

`NEW_REGRESSIONS=0`

Production constraint remains:

`REAL_CLIENT_DATA_ALLOWED=no`

---

# Stop Conditions

Handle routine engineering tasks autonomously.

STOP for the user only when genuinely required for:

- login
- 2FA
- secret/password entry
- billing
- DNS ownership
- irreversible/destructive production action
- major product ambiguity
- architecture outside approved scope
- explicitly gated production migration

Do NOT stop for routine:

- Terminal commands
- Git inspection
- branch creation
- tests
- builds
- logs
- normal commits
- normal pushes
- Railway health inspection

---

# Standard MAOS Workflow

For every engineering task:

VERIFY CONTEXT

→ CLASSIFY RISK

→ INSPECT CURRENT CODE

→ IDENTIFY SECURITY / DB IMPACT

→ PLAN

→ IMPLEMENT SMALLEST SAFE CHANGE

→ FOCUSED TESTS

→ NEGATIVE SECURITY TESTS

→ REGRESSION TESTS

→ REVIEW FULL DIFF

→ COMMIT

→ DEPLOY ONLY WHEN CURRENT GATE ALLOWS IT

→ VERIFY PRODUCTION

→ BACKUP WHEN REQUIRED

→ REPORT EVIDENCE

Never jump directly from editing code to production.

---

# Evidence Standard

Use:

VERIFIED

LIKELY

UNKNOWN

Never report LIKELY as VERIFIED.

Strong evidence includes:

- runtime HTTP responses
- executed tests
- DB queries
- Railway deployment state
- production logs
- real storage behavior

Source inspection alone does not prove runtime security.

---

# Reporting

Reports should clearly identify:

- what changed
- why
- security impact
- database impact
- tests
- regressions
- deployment impact
- unresolved risk
- next gate

Distinguish:

BLOCKING

NON-BLOCKING

FUTURE IMPROVEMENT

Never print secrets.

---

# Skill Safety

This Skill must NEVER contain:

- passwords
- access tokens
- DATABASE_URL values
- JWT secret values
- S3 credentials
- SMTP credentials
- private SSH keys

Public service names, repository paths, and architecture information are allowed.

If a secret is ever added here:

treat that secret as compromised and rotate it.
