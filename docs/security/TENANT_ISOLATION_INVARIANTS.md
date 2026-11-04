# MAOS tenant-isolation invariants and the `isolation-gate` CI check

**Status:** active gate since B09 (2026-11-04). **Owner:** platform engineering.
**Companion:** `tenant-isolation-baseline.md` (the design baseline these tests enforce).

Every pull request runs the CI job **`isolation-gate`** (`.github/workflows/ci.yml`).
It boots the real API over HTTP against a fresh PostgreSQL and runs the suites
below. A failure means a boundary between **companies**, **clients**, **roles**
or **sessions** leaks. The job is blocking: a red gate is never worked around
by retrying, skipping a suite or loosening an assertion; the leak is fixed.

Each invariant names the suite in `apps/api/test/` that proves it, so a failing
file name points at the broken rule.

## 1. Company (tenant) boundary

| # | Invariant | Suite |
|---|---|---|
| 1.1 | A request acts inside one company: the active membership of the caller. A company the caller does not belong to answers as if its records did not exist (404/403, never a partial body). | `company-access-isolation` |
| 1.2 | Multi-company users switch companies explicitly; an OWNER's explicit grants apply per company and never cross into another. | `company-access-isolation`, `security-gate-explicit-grants` |
| 1.3 | Every ID sent in a body or path (project, assignee, parent task, subtask) must belong to the caller's company; a foreign ID is refused, nothing is written. | `security-gate-foreign-ids` |
| 1.4 | The same holds for files, approvals, chat, voice notes and internal notes. | `security-gate-foreign-ids-content` |
| 1.5 | The same holds for leads, opportunities, meetings, follow-ups, invoices and payments. | `security-gate-foreign-ids-crm-finance` |
| 1.6 | A role change or removal in company A changes nothing in company B. | `security-gate-role-transitions` (E03-04), `security-gate-member-management` |

## 2. Client boundary (client portal)

| # | Invariant | Suite |
|---|---|---|
| 2.1 | A client's list endpoints carry one client's records only; direct resource IDs of another client answer 404; content routes (files, approvals, chat) follow the same rule; a client with no scope sees nothing. | `security-gate-client-isolation` |
| 2.2 | An approved client receives exactly its client scope, nothing wider. | `client-onboarding-scope` |
| 2.3 | Work inside a client's project inherits the project's client scope (a task shared with the client reaches the portal; moving it to an internal project removes it; changing the project's customer moves its tasks). A delivery whose file was deleted no longer shows. | `client-scope-inheritance` |
| 2.4 | An approval stores only a visibility scope the backend enforces; no unenforced "visible to" choice exists. | `visibility-scope` |
| 2.5 | A client reviews only its own deliveries and sees the company name only, never a staff name; change requests reach the assigned employee. | `security-gate-client-deliveries` |
| 2.6 | Appointments: only staff schedule them, only for a shared project; each client sees only its own. | `security-gate-client-portal-v2` |
| 2.7 | A problem report is opened only by a client, only about its own delivery; it reaches management only; internal notes never reach the client. Work requests follow the same rule. | `security-gate-client-complaints`, `security-gate-client-work-requests` |
| 2.8 | A default invoice send reaches only the invoice's own, active client. | `invoice-default-recipients` |
| 2.9 | A client copy of a file keeps the content intact and drops identifying metadata (author, device, location); client file names reveal no internal names. | `client-file-privacy` (unit) |

## 3. Role and grant boundary

| # | Invariant | Suite |
|---|---|---|
| 3.1 | Every protected route is actually guarded: unauthenticated calls answer 401, and a controller with every decorator still fails if its module never wired `PermissionsModule`. Self-scoped routes (profile, own voice notes) act on the caller only. | `security-gate-authz` |
| 3.2 | A CONTRACTOR sees only work assigned to it: projects, tasks, subtasks, files; its chat and notifications are scoped the same way. | `security-gate-contractor-scope`, `security-gate-explicit-grants` |
| 3.3 | Explicit grants are changed only by those allowed to; approvals are decided by explicit approvers only; invoice read, edit and record-payment are separate grants, per company. | `security-gate-explicit-grants` |
| 3.4 | A role change drops the old role's permissions and stale grants at once, on existing and refreshed tokens; a refused change writes nothing; the last OWNER is never changed or removed. | `security-gate-member-management`, `security-gate-role-transitions` (E03-01..03) |

## 4. Session boundary

| # | Invariant | Suite |
|---|---|---|
| 4.1 | A suspended or otherwise non-active user loses access immediately: existing access tokens and refresh tokens stop working, whether the status changed through the suspend endpoint or elsewhere; unaffected users keep working. | `security-gate-session-revocation` |
| 4.2 | Session list and revoke act on the caller's own sessions only. | `security-gate-sessions` |

## 5. Storage boundary

| # | Invariant | Suite |
|---|---|---|
| 5.1 | Deleting a file removes every stored object of every version, in an order that leaves no orphan, with deletion targets taken from the database, never from client input. | `security-gate-file-deletion` (unit) |

## Rules for changes

- A new endpoint or job that reads or writes company-owned data adds a case to the matching suite (1.3–1.5 for new foreign IDs; 2.x for anything a client can reach) in the same PR.
- A new role, grant or scope adds its transition to `security-gate-role-transitions`.
- A suite is never removed from the gate without an ADR; moving one between jobs keeps it in this file.
- Reproduce locally with a disposable database (never a shared or production one):

```bash
cd apps/api && npm run build && MAOS_INTEGRATION=1 DATABASE_URL=postgresql://maos:maos_password@127.0.0.1:5432/maos_db JWT_SECRET=<64 random chars> JWT_REFRESH_SECRET=<64 random chars> node --test test/security-gate-*.test.mjs test/company-access-isolation.test.mjs test/client-onboarding-scope.test.mjs test/client-scope-inheritance.test.mjs test/visibility-scope.test.mjs test/invoice-default-recipients.test.mjs test/client-file-privacy.test.mjs
```

## Known gaps (tracked in the master task list)

- Browser end-to-end: the CI job `e2e-smoke` (A09, `apps/web/e2e/smoke.spec.ts`) signs in as OWNER and as CLIENT in Chromium and proves the CLIENT lands in the portal only, is offered no internal navigation, and is sent back to the portal from internal URLs. API-level boundaries stay with the suites above.
- Row-level security in PostgreSQL is not used; isolation is enforced in the tenant-aware repositories and guards above (`postgres-least-privilege-plan.md`, decision pending).
- Reports and search are covered by their own suites (`global-search`, `customer-overview`), not by this gate.
