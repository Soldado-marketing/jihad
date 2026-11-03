# MAOS Progress Log

Chronological record of completed work, verified tests, PRs, deployments, failures and their resolutions, and outstanding decisions. Newest entry last. Entries before 2026-11-02 are in `docs/MAOS_EXECUTION_LEDGER.md` (sections "Completed / merged / blocked" and the dated window entries); they are not repeated here.

Backlog of record: `docs/MAOS_MASTER_TASK_LIST.md`. Checkpoint: `docs/MAOS_RESUME.md`.

---

## 2026-11-02 — Client Portal V2 release (#132 → #129 → #130 → #131)

**Merged and deployed, in this order, each with a separate owner GO:**

| PR | Merge commit | Merged (UTC) | Content |
|---|---|---|---|
| #132 (other session) | `e0eab78` | 14:58 | A task shared with the client reaches the client portal |
| #129 | `81843dd` | 15:10 | Client file privacy, client-friendly portal |
| #130 | `83b9be8` | 15:26 | Client Portal V2: My Work, invoices with partial payments, filming appointments, notifications |
| #131 | `de2ee1b` | 15:51 | Report a problem → management (internal notes, no staff identities); project invoices inherit the project's customer, 409 `INVOICE_SCOPE_MISMATCH` on conflict |

**Procedure per PR:** main merged into the branch (no conflicts) → local CI-equivalent → GitHub CI green on the exact head → fresh backup with sha256, `pg_restore --list` and isolated REHEARSAL OK (`maos-20261102T142251Z`, `…T150507Z`, `…T154400Z`) → `gh pr merge --merge --match-head-commit` → Railway deploy of both services verified → readiness 200 → logs clean → unauthenticated/forged-token smoke.

**Tests on the final code (`de2ee1b`):** API unit 401/401; integration-api 35/35; integration + security 458/458; web 291/291; main CI SUCCESS. Production smoke: 34/34 forged or unauthenticated requests refused with 401; new pages served 200.

**Acceptance requirements (owner directive, isolated stack with fictional data):**

| Requirement | Result |
|---|---|
| Video upload (MP4), playback, download, size limit, content validation | PASS up to 25 MiB: real MP4 201, fake `.mp4` 400, 28.6 MB refused; playback and download in the portal. Above 25 MiB NOT VERIFIED (production `FILE_MAX_UPLOAD_BYTES` unset → 25 MiB; hard ceiling 100 MiB) |
| Persistent storage after restart | PASS: identical bytes after API restart (isolated S3-compatible store); production bucket private |
| Critical notifications | PASS for in-app notices and appointment reminders; documented limit: in-app notices do not reach an offline client; no external messaging without authorization (D01) |
| Google Drive privacy | PASS for MAOS (it never touches Drive sharing); Drive-side audit NOT VERIFIED (needs owner approval to use the connector) |
| Bucket capacity | NOT VERIFIED (B05) |
| Real-user production acceptance (client, employee, manager) | NOT VERIFIED (A01–A03; no production test accounts; real client data not allowed) |

**Failures seen and resolved during the release (none affected production):**

- An inline re-run of the integration batch exited 1 after migrations without running a test (file-list extraction failed inside the inline shell); superseded by the scripted run, 458/458.
- `deadline-reminders` "reminds the assignee … once" failed once in a 44-file batch; passed 3/3 alone and 458/458 in a second batch; #131 touches no scheduler or task code → F03.
- First web run on #131 failed two guards (new nav id without a sidebar slot; forbidden word "reports" in client source); fixed, 291/291.
- Early wait loops exited 144 with no output; isolated test servers were stopped deliberately for rebuilds.

**Cleanup:** session API (3212) and web (3230) stopped; containers `maos-demo-pg` and `maos-try-minio` stopped and kept; disposable `maos-fu-testdb` removed. Other sessions' containers, processes and the main checkout (on `fix/client-scope-inheritance`) untouched.

**Final status 2026-11-02 16:05Z: HEALTHY** — both Railway services SUCCESS on `de2ee1b`, readiness 200, scheduler running (invite-expiry, deadline-reminders, appointment-reminders), logs clean.

**Owner V2 production checklist (A01):** sign in as owner → create a delivery on a client project → open the portal as that client's (fictional) user → delivery visible, approve, request a revision → invoice with a partial payment shows the remaining balance → filming appointment appears with a reminder → report a problem → manager answers with an internal note → client sees the answer, not the note → employee has no "Problem reports" entry.

## 2026-11-02 — Master Development Plan adopted

- Owner directive "MAOS — Master Development Plan & Continuous Execution" received after the release verification.
- State recovered: main `de2ee1b`; production `jihad` + `maos-web` SUCCESS on `de2ee1b`, readiness 200; open PRs #109, #110, #120; local nightly backups SUCCESS ×4 today, off-site copy not configured; production variables present: `RESEND_API_KEY`, S3 set, `MAOS_SCHEDULER_ENABLED`, `FILE_MAX_UPLOAD_BYTES` unset.
- Backlog reconciled against merged work: J02–J05 already delivered (#112, #114, #123, #124, #127); C04 delivered (#129–#131); E04 delivered; C01 configurable but production value undecided.
- Created `docs/MAOS_MASTER_TASK_LIST.md`, this file and `docs/MAOS_RESUME.md`; the ledger's RESUME CAPSULE now points to `MAOS_RESUME.md`.
- Phase 1 reconciliation: A01–A03 and B01, B02, B04 need the owner (production session, Resend dashboard, off-site provider, Drive connector approval). B03 (least-privilege design) and B05 (storage inventory) are the only Phase 1 rows Claude can advance without approval.

## 2026-11-02 — B05 storage inventory, B03 least-privilege design

- **B05 (read-only production check):** bucket inventory with credentials injected in-process (`railway run -s jihad`), output limited to counts: 0 objects, 0 bytes, versioning off. From today's dump (`maos-20261102T154400Z`): `FileAsset` 2 rows, both metadata-only (mime type and size null, `versionCount` 0, created 2026-10-24), `FileVersion` 0. Bucket and database are consistent: nothing has been uploaded to production yet, no orphan objects, no dangling references. Capacity not a concern at 0 bytes; storage monitoring does not exist yet (follow-up noted in the task list).
- **B03 (design only, nothing applied):** `docs/security/postgres-least-privilege-plan.md` — roles `maos_app` (DML only, default privileges for future migrations), `maos_backup` (`pg_read_all_data`), administrator kept for `migrate-deploy-one.sh`; SQL, verification queries, disposable-PG18 rehearsal steps, production window and rollback. Grounded in a code check: the API runs no DDL (raw SQL is `SELECT 1`, `SELECT … FOR UPDATE`, advisory lock, one `UPDATE`).
- Docs PR #133 opened (not merged; owner decision).

## 2026-11-02 — B03 rehearsal on a disposable PostgreSQL 18 (nothing touched in production)

Container `maos-b03-pg` (postgres:18, throw-away passwords in files, never printed), 15 migrations applied as the administrator, then the plan's SQL as-is.

| Check | Result |
|---|---|
| Role and grant inventory | `maos_app`: SELECT 48 / INSERT, UPDATE, DELETE 47 tables (`_prisma_migrations` read-only); `has_schema_privilege(maos_app, public, CREATE)` = false |
| `integration-api` as `maos_app` | 35/35 |
| Integration + security suites (44 files) as `maos_app` | 456/458. The 2 failures are the expected fault-injection tests that create a PostgreSQL trigger from the test itself (`time-entries` "a database refusal answers 400", `data-transfer` "rolls the whole file back"): test-only DDL, not application behaviour. CI keeps the administrator role, so CI is unaffected |
| Advisory lock as `maos_app` | `pg_try_advisory_xact_lock` → true (scheduler works) |
| Negative, `maos_app` | CREATE TABLE → permission denied for schema; DROP/ALTER TABLE → must be owner; INSERT/DELETE on `_prisma_migrations` → permission denied |
| Negative, `maos_backup` | INSERT and UPDATE → permission denied; SELECT works |
| `pg_dump` as `maos_backup` vs administrator | identical: 523 entries, 48 tables each |
| Default privileges | new table created by the administrator afterwards: `maos_app` INSERT … RETURNING works without a new GRANT |

Conclusion: the plan is safe to apply as written. Production application remains owner decision O10 (roles via the private tunnel, `DATABASE_URL` on `jihad`, Keychain item for the backup). Container removed after the run.

## 2026-11-02 — J06 multi-company verification (isolated stack, fictional data)

API from `main` code on the isolated database (three fictional companies: the owner is OWNER in `soldado-demo` and `second-studio`, MANAGER in `third-agency`; an employee belongs to one company; a manager to two). Probe script kept in the session scratchpad (`demo/j06-probes.sh`); 32 probes, all read-only except the switches themselves.

| Area | Probe | Result |
|---|---|---|
| Switching | OWNER switches A→B and B→C; refused for a tenant without membership (403) and for the current tenant (400) | PASS |
| Session context | After a switch the previous JWT is refused everywhere (401), and the pre-switch refresh token cannot revive it (401) | PASS |
| Direct API access | With a B token every A resource by id answers 404: project, task, invoice, invoice PDF, file, file download, complaint, activity timeline; PATCH and DELETE on an A project 404 (a 400 appears only when body validation fails, identical for a nonexistent id, so no existence leak) | PASS |
| Lists | B lists of projects, invoices, files and notifications contain no A id | PASS |
| Header forgery | `x-tenant-id` / `x-actor-role` on a B token change nothing | PASS |
| Role per company | Same user as MANAGER in C: OWNER-only routes refused (403): admin requests, finance summary, company members, audit events | PASS |
| Switch rights | Employee of one company: `canSwitch` false, switch 403. MANAGER in two companies may switch by default unless the owner turned it off (`companySwitchAllowed`: OWNER always, explicit override wins, else MANAGER only) — matches `docs/MAOS_COMPANY_SWITCH_ACCESS.md` | PASS (by design) |
| Caching | API responses carry no `Cache-Control` header. Authenticated JSON without validators is not cached heuristically by browsers, and the web app re-fetches on company switch, but an explicit `Cache-Control: no-store` on every `/api` response would make this a guarantee instead of a browser default | GAP → J07 |
| Search | Global search for an A project name from a C token returns nothing; the A owner's search also returned nothing for that term, so the probe is not conclusive | NOT CONCLUSIVE (covered by the `global-search` permission tests in CI) |

Conclusion: J02–J05 hold under direct API probing; one hardening gap (J07) recorded. Isolated API stopped, demo containers stopped and kept.

## 2026-11-02 — J07 no-store default (draft PR #134)

- Inspection: API responses had no `Cache-Control`; only file streams, invoice PDFs and CSV exports set `private, no-store` themselves (files are streamed through the API with their own headers; no signed-URL redirects).
- Change: `NoStoreMiddleware` registered in `AppModule` for every route, before handlers, as an overridable default. No request data inspected; downloads, streaming and health unchanged beyond the header.
- Tests: new `test/no-store-cache.test.mjs` (added to the CI unit gate), four integration-api assertions, hardening regex relaxed for the two-middleware `apply`. Local: unit gate 407/407, integration-api 39/39 on a disposable PG18 (removed afterwards), build OK; typecheck errors identical to main (149, pre-existing jest spec files).
- Draft PR #134 opened; not merged (owner release approval O11).

## 2026-11-02 — C03 supported formats review (draft PR #135, tests only)

| Format | Accepted | Verified by | Served to the browser |
|---|---|---|---|
| PNG, JPG/JPEG, GIF, WEBP | yes | magic bytes (+ WEBP fourcc at byte 8) | inline |
| PDF | yes | `%PDF-` | inline |
| TXT, CSV | yes | no NUL byte in the first 4 KiB | attachment |
| ZIP | yes | PK signatures; never extracted or inspected inside | attachment |
| DOCX, XLSX, PPTX | yes | PK signatures (OOXML is a ZIP) | attachment |
| MP4, MOV | yes | `ftyp` / QuickTime atom at byte 4 | inline (portal `<video>` playback) |
| `.url` link | yes | text; the web wraps a URL into an Internet shortcut; the portal renders it as an external link | attachment |
| DOC, XLS, PPT (legacy OLE) | no | — | owner decision O12 whether to add |
| SVG, HTML, JS, EXE, JSON | no (by design) | — | — |

Also confirmed: size limit checked before content; empty files refused; double extensions judged by the last one; a renamed file is refused when its bytes disagree; downloads force `attachment` for everything not inline-safe. New `test/file-formats-matrix.test.mjs` (60 tests, in the CI unit gate) pins every row. No behaviour change.

## 2026-11-02 — D02 client requests for new work (draft PR #136)

- API: the problem-report service is now a kind-parameterised conversation service (`KINDS.complaint`, `KINDS.request`); `WorkRequestsService` subclasses it with `resourceType 'request'`, audit resource `WorkRequest`, actions `request.*` and its own notification texts. Controllers `/client/requests` and `/requests` subclass the complaint controllers; `chat.service` excludes both resource types. No migration.
- Web: `/client/requests` (list + "Request new work" form, detail with reply) and `/requests` (management: open/closed tabs, answer, internal note, close, reopen), derived from the problem-report pages with request wording; notification links; "Work requests" entry in the Operations group (OWNER, MANAGER).
- Tests: `security-gate-client-work-requests` (10, own fixture prefix, in the CI integration list) and the complaints gate pass together 20/20 on a disposable PG18 (removed afterwards); web 291/291; API and web typecheck clean (API spec-file errors unchanged from main).
- Not done: a "Request new work" link on the client dashboard (one line once #136 is merged); production acceptance NOT VERIFIED (not deployed).

## 2026-11-03 — E01 one Team & Access experience (draft PR #137)

- Web only. New route `/team` (redirects to `/team/members`) with a tab bar (`src/components/team/team-tabs.tsx`, list in `src/navigation/team-tabs.ts`): Members & access, Invitations, User requests. The former Company Access, Invitations and User Requests pages moved unchanged (`git mv`) to `src/components/team/*-panel.tsx` and are re-exported by the tab routes.
- Old routes `/dashboard/admin/company-access`, `/dashboard/admin/invites`, `/dashboard/admin/users/requests` are server redirects; the registration e-mail review link (API `mail.service`) still points at the last one and keeps working. Dashboard OWNER shortcuts point at the new addresses.
- Navigation: one OWNER-only `team` entry ("Team & Access", glyph TM) in the Workspace group replaces `company-access`, `admin-users`, `admin-invites`; the `admin-users` active-state special case in `sidebar.tsx` removed. Role filter untouched: CLIENT and granted managers never see it.
- No API change, no permission change, no migration. Owner-only endpoints, confirm dialogs and "no edit/remove for Owners" kept verbatim (moved files).
- Tests: new `test/team-access.test.mjs` (10); `access-scope`, `dashboard-roles`, `explicit-grants`, `global-search`, `invites`, `member-management` follow the moved paths / new hrefs. Web typecheck, `next build` and 301/301 tests green locally; CI pending at checkpoint.
- Not done: production acceptance NOT VERIFIED (not deployed); owner decision O14 (release approval for #137).

## 2026-11-03 — F01 invoice list on a 375 px phone (draft PR #138)

- `/finance/invoices`: under `md` one card per invoice (number as the link, status badge, project, total/due as a two-column `<dl>`); from `md` up the table as before, with `aria-label="Invoices"` on both. Long numbers wrap (`min-w-0 break-words`), project names truncate, the badge never shrinks.
- `/finance/invoices/[id]`: the line-item table sits in an `overflow-x-auto` box (`min-w-[28rem]`), so it scrolls inside its card, not the page.
- `/client/invoices` was already a single-column wrapping card list; unchanged, pinned by the test.
- Tests: new `test/invoice-table-mobile.test.mjs` (5). Web typecheck, `next build`, 296/296 green. E01 PR #137 CI: SUCCESS on all three jobs.
- Not done: live 375 px browser check (needs an authenticated workspace with invoices); production acceptance NOT VERIFIED (not deployed); owner decision O15 (release approval for #138).

## 2026-11-03 — F02 plain-language errors (draft PR #139)

- New `src/lib/api-errors.ts`: `apiErrorMessage(status, body)` returns the API's own sentence when it reads as one written for people (`Invoice not found`, `Only an active version can be delivered.`, class-validator messages joined into one line) and otherwise one plain sentence per status: 400, 404, 409, 410, 413, 415, 422, 429; 5xx "Something went wrong on our side…"; no response "Could not reach the server…". 401 and 403 keep their fixed wording (API reason codes such as `own_entries_only` never reach the screen). Codes, framework defaults (`Not Found`, `Cannot GET /x`), `HTTP 404`, stack and database text are rejected by `isPlainMessage`.
- `src/lib/fetch.ts`: `apiFetch`, `apiUpload` and `apiBlob` all throw the mapped sentence; network failures map too; `FORBIDDEN_MESSAGE` / `SESSION_EXPIRED_MESSAGE` re-exported so existing imports and the control-center check are unchanged. Pages untouched; clients and staff read the same safe wording.
- Tests: new `test/plain-language-errors.test.mjs` (10). Web typecheck, `next build`, 301/301 green. F01 PR #138 CI: SUCCESS on all three jobs.
- Not done: production acceptance NOT VERIFIED (not deployed); owner decision O16 (release approval for #139).

## 2026-11-03 — F03 deadline-reminders test stabilised (draft PR #140, test only)

- Reproduction on a disposable `postgres:18` (`maos-f03-pg`, migrated, fictional secrets, removed afterwards): the full 44-file CI batch failed **6/6** at `a second run sends nothing new`; a 9-suite subset passed 20/20 — hence "intermittent" in CI, where timing decides whether a sibling suite's due-soon item exists between the two runs.
- Root cause: the assertion compared the job's returned count (every tenant in the shared database) to 0. `my-work` (task due in 3 h, assigned), `customer-overview` (task due in 24 h, assigned) and `calendar` (requested approval due in range) create such items concurrently. Secondary: `runNow` can answer `skipped_locked` while another instance holds advisory lock 2.
- Fix in `apps/api/test/deadline-reminders.test.mjs` only: `inOurTenants()` before/after counts replace the global count (both "once" assertions); `run()` retries skipped rounds; new case "another company's due-soon work raises the job count, not ours". `deadline-reminders.job.ts` and `scheduler.service.ts` untouched.
- Evidence: suite alone 5/5; full batch 20 consecutive runs 459/459 (≈13 s each). F02 PR #139 CI: SUCCESS on all three jobs.
- Owner decision O17 (merge #140; test-only, no deploy effect).

## 2026-11-03 — M01 navigation audit (draft PR #141, docs only)

- `docs/ux/MAOS_NAVIGATION_AUDIT_M01.md`: 27 navigation items with route, roles/grants, group today (Workspace, Delivery, Team, Operations) and target group (Workspace · Company & Team · Projects & Delivery · Customers & CRM · Finance & Banking · AI Assistant · Reports · Settings); per-role view; findings; M02 acceptance.
- Decisions recorded for M02: Notifications, Chat and Collaboration → Workspace; `team` (E01) and Audit Log → Company & Team; Files, Approvals, Voice Notes, Problem reports, Work requests → Projects & Delivery; Import & export → Settings; AI Assistant group appears only with an item (phase L). Routes and `allowedRoles` untouched.
- F03 PR #140 CI: web + audit SUCCESS, API job pending at checkpoint.

## 2026-11-03 — M02 sidebar regroup (draft PR #142)

- `sidebar.tsx` `navGroups`: Workspace (dashboard, control-center, my-work, calendar, notifications, chat, collaboration) · Company & Team (team, company-access, admin-users, admin-invites, audit) · Projects & Delivery (projects, tasks, time, files, approvals, voice, complaints, requests) · Customers & CRM (customers, crm) · Finance & Banking (finance, invoices) · AI Assistant (empty until L; never rendered empty) · Reports · Settings (data, settings). Glyphs `team: 'TM'`, `requests: 'WR'` added.
- Nothing else changed: routes, `allowedRoles`, grants, `visibleNavGroups` (permission filter first, grouping after), compact menu.
- Tests: new `test/sidebar-groups.test.mjs` (8: order, one slot per id incl. pending ids, CLIENT none, CONTRACTOR view, MANAGER finance via grant only, OWNER view); `time-entries` now asserts a slot for `time` instead of the old neighbours. Web typecheck, `next build`, 299/299.
- Merge note: #137 (E01) pins the old Workspace ids in `test/team-access.test.mjs`; the second of #137/#142 to merge updates that one line.
- CI: #140 and #141 SUCCESS on all jobs. Owner decision O19 (release approval for #142).

## 2026-11-03 — M03/M04 navigation visual check (branch `feat/sidebar-regroup`, #142)

- Method: local `next dev` of the branch, a fictional OWNER stored in the browser (no API; dashboard sections show "Could not load", which is irrelevant to the shell), built-in browser at 1440×900, 768×1024, 375×812.
- 1440: sidebar shows Workspace (7) · Company & Team (4) · Projects & Delivery (7) · Customers & CRM (2) · Finance & Banking (1) · Reports (1) · Settings (2); AI Assistant hidden; glyphs and active indicator as before; page `scrollWidth` 1430 ≤ 1440. The sidebar is 1661 px tall, so the last groups need a page scroll on a 900 px screen.
- 768 and 375: sidebar hidden; bottom bar + Menu dialog with the same groups and order; `scrollWidth` = `innerWidth` (no horizontal overflow); smallest link 44 px; `aria-current="page"` on Dashboard; the dialog scrolls down to Settings. PASS.
- Not done: collapsible group headings (M03 wording) — not implemented; recorded as owner decision O20 (recommend: collapsible groups remembered per browser, OWNER sidebar only, since the compact menu already scrolls). Production NOT VERIFIED (not deployed).
- Local server stopped; nothing committed for M03/M04 (no defect found).

## 2026-11-03 — E03 security regression audit: role transitions and permission revocation (draft PR #143, test only)

| Item | Result | Evidence |
|---|---|---|
| E03-01 Manager → Client | PASS | invoices list/by-id 403, approval decision 403, `/leads` 403, member list 403, `/client/projects` 200; DB role CLIENT, scope from the customer, CLIENT_LEVEL, no grant rows |
| E03-02 Employee → Manager | PASS | `all-tasks` + `decide-approvals` rows removed; `/leads` 200 on the same token; a manager still needs the approver grant |
| E03-03 Revoke "Sees all tasks" | PASS | list hides the unassigned task, `GET /tasks/:id` 404, member view shows off, audit +1 per change |
| E03-04 Company A vs B | PASS | B role, grant row, session unchanged; A invoice 404 through B; audit event in A only |
| E03-05 Existing JWT / refresh | PASS | old token refused; refreshed token carries `role: CLIENT` and is refused the same way (+ `company-access-isolation`) |
| E03-06 Grants never return | PASS | employee→manager→employee: both grants off (+ existing employee→contractor→employee case) |
| E03-07 Unauthorized changes | PASS | employee, self, Owner of another company → 403 for role and grants; nothing written |
| E03-08 Audit without duplicates | PASS | `role.changed` +1 per success, 0 on refusal; `membership.grant_updated` +1 per change |
| E03-09 Atomic / rollback | PASS | OWNER, unknown role, foreign customer, missing customer, customer for non-client → 400; role, rows, audit count and the kept grant unchanged |
| E03-10 Last Owner | PASS | single-owner company: change 403, remove 403, suspend 403 (even by themself); second Owner also unchangeable |

- Method: disposable `postgres:18` (`maos-e03-pg`, migrated, fictional secrets, removed afterwards), real Nest HTTP, three fictional companies. Existing suites first: `security-gate-member-management`, `security-gate-explicit-grants`, `company-access-isolation`, `security-gate-session-revocation`, `security-gate-contractor-scope`, `audit-log` → 73/73 (baseline). New suite 8/8; together 81/81; inside the 44-file parallel batch 3 runs, new suite green each time (18 failures per run are `integration-api` bootstrap/login, which CI runs alone and first by design; not related).
- "Sees all tasks" review: a per-membership `MembershipPermission` grant read by `resource-scope.service.ts`; OWNER-only to change; cleared by every role change; audited. Nothing changed for any real employee.
- No application code changed; `ci.yml` gains the suite in the integration batch. Owner decision O21 (merge #143).

## 2026-11-03 — G04 graph freshness recorded; E05 gated

- G04: the per-checkout code graph (`graphify update .`, AST only, no LLM calls) was refreshed after each code task in this session's worktree; latest report 926 files, 10192 nodes, 18198 edges, 721 communities, built from `bb98dfb`. Procedure stays: refresh once after a code-changing task, never commit `graphify-out/`. `graphify-out/` is untracked and not ignored in the repo → O22 (approve adding it to `.gitignore`).
- E05 needs read-only production access that the owner provides (O23); nothing was read from production in this session (a production variables read was refused by the tool policy and not retried).

## 2026-11-03 — D04 side-by-side version comparison (draft PR #144) and J01 settings verification

- D04 (web only, branch `feat/version-compare` from `origin/main` `de2ee1b`, commit `c49e59f`): on the file page staff pick two versions; images and PDFs render side by side, every other type is compared by its details (name, size, upload time, status) with the size difference in plain words; quarantined/blocked versions cannot be picked; stacked on a phone, two columns from `md` up. Bytes come through the existing `GET /files/:id/versions/:versionId/content?disposition=inline` route; no storage key or pre-signed URL reaches the browser; object URLs are revoked. Blueprint §30 check: enrichment of the Files detail (§14 "versions" action list, §25 ENRICH_EXISTING); no schema, no authorisation, no tenant-scope change; Phase 3 D row, in order.
- D04 client side not built: `assertClientMayRead` lets a client open only a version under review or approved for its scope, so an earlier round (changes requested) is refused. Comparing rounds in the client portal would need that rule extended to "every version previously delivered to this scope" → owner decision O25.
- Evidence: new `apps/web/test/file-version-compare.test.mjs` 10/10; web suite 301/301; `tsc --noEmit` and `next build` clean. Not yet checked in a live browser with stored files; listed under the isolated acceptance walk. Owner decision O24 is unrelated to the PR (J01), O26 is its release approval.
- J01 verification (no code): `Tenant` holds only `name`, `slug`, `status`; no tenants controller, no settings endpoint; `/settings` is read-only display. Everything the row names (branding, sender name, locale/currency/timezone, defaults, cost rules) has no storage, so the settings page needs the `TenantSettings` model from Blueprint §22 → ADR + migration approval and the owner's priority list → O24.
- Progress panel: pinned to the owner's claude.ai sidebar (owner message 2026-11-03); `docs/tools/fetch_prs.sh` now writes the PR state file the generator reads. CI on #133–#143: all three jobs SUCCESS.

## 2026-11-03 — D03 client review deadlines and reminders (draft PR #145)

- Decision at start: the review-by date lives in the existing `ApprovalRequest.dueAt` column (never written by the delivery flow until now), so the column variant needed no migration and the project-deadline guess was not used.
- API (branch `feat/client-review-reminders` from `origin/main` `de2ee1b`, commit `38ac54b`): `SubmitDeliveryDto.reviewBy` (optional ISO 8601; past or junk → `400 REVIEW_BY_IN_PAST`, nothing created); the service stores it, returns it to staff rounds and to the client list/detail as `reviewBy`, and names the date in the delivery notice. New `ClientReviewRemindersJob` (`client-review-reminders`, every 30 min, lock key 4): deliveries `REQUESTED` + client-visible + `dueAt` in (now, now+24 h] → one notification per client member of that delivery's own scope through the single notification writer; dedupe key `delivery.review_reminder:<id>:<dueAt>`. Nothing to staff, to another scope or to another company; text = delivery title + time only.
- Web: `reviewByLine()` / `reviewByToIso()` in `src/lib/deliveries.ts`; the client list and detail show the date (amber inside the last 24 h and after it, calm once answered); staff set it with a `datetime-local` picker in the client review panel and see it on the rounds.
- Blueprint §30: no schema, no new endpoint, no permission change; tenant isolation and client scope verified with two companies sharing a scope key; Phase 3 D row in order.
- Evidence (disposable `postgres:18` `maos-d03-pg`, fictional companies, removed afterwards): new API suite 7/7 (refused past date, stored and shown date without staff identity, no-date delivery unchanged, job registered, reminder reaches exactly the two client members of scope X and company B's own client, nothing to staff/client Y/owner B, second run adds nothing, nothing after a change request); with scheduler, client deliveries, client portal v2, notification writers, deadline reminders 50/50; API unit 506 pass (10 todo); web 298/298; API build, web typecheck and build clean. `scheduler.test.mjs` now lists four jobs; CI batch gained the suite.
- Not yet seen in a live browser; release approval is O27.

## 2026-11-03 — E02 access history per member (draft PR #146)

- Finding: membership events are recorded under two different ids — `role.assigned` / `scope.assigned` / `role.changed` / `user.suspended` / `user.reactivated` with the **user id**, `membership.grant_updated` / `membership.removed` with the **membership id** — so the existing audit list (filter by resource type, actor, outcome) could not show one member's history. Left as recorded (history must stay readable); the new route joins both.
- API (branch `feat/member-audit-history` from `origin/main` `de2ee1b`, commit `c7815e9`): `GET /audit-events/member/:userId` on the audit log controller, OWNER only through the same sensitive `AUDIT_EVENT` read permission; resolves the membership (404 outside the company), reads both ids restricted to the eight access actions, newest first, up to 100, returns action/outcome/time/actor and the already-redacted details — never session, device or resource ids. No schema, no write, no permission matrix change.
- Web: `src/lib/member-history.ts` wording ("Employee → Manager", "Sees all tasks: on", "Was Contractor", "Joined as Employee"), `src/components/team/member-history.tsx` (loads on open), access-action labels in `src/lib/activity.ts`, rendered under every member on the company-access page (also removed members and owners). CLIENT never sees it: the route refuses, and no client page imports it (tested).
- Blueprint §30: enrichment of Team & Access (§7/§25 existing `AuditEvent`), read-only, OWNER-only, tenant-scoped; Phase 3 E row in order.
- Evidence (disposable `postgres:18` `maos-e02-pg`, fictional data, removed afterwards): `audit-log.test.mjs` 6/6 with the two new cases (manager/employee/contractor/client → 403, unknown and foreign user → 404; events under both ids joined newest first with details, same-id event of another company excluded, no ids beyond the actor); web `test/member-history.test.mjs` 6/6; web 297/297; API unit 506 pass; typecheck and builds clean. Not yet seen in a live browser. Release approval O28.
- Phase 3 is now fully delivered or gated: D05 needs a schema change (multi-file delivery), D01 waits on O8, E05 on O23, J01 on O24. Next READY rows by phase order are docs-only: K06 (DATEV export: spec verification first) and G05 (gap analysis vs Trello/ClickUp/Notion).

## 2026-11-03 — Scope correction (owner directive): website removed, AI Assistant backlog restored

- Section I (Soldado Marketing website) removed from the master task list and the panel: soldado-marketing.de is a separate project outside MAOS; nothing there is developed, modified or deployed from this plan.
- Section L restored from the approved specification `docs/MAOS_AI_ECOSYSTEM_PHASE_9.md` as ten independently testable rows L01–L10 (permission gate, provider/cost controls [O8], assistant Q&A, natural-language task/project proposals, human approval layer with no banking action ever, permission-safe search, customer/workflow assistance, finance analysis read-only, AI audit logging, multi-company awareness). All NOT_STARTED except L02 BLOCKED_OWNER (O8); nothing counted as done.
- Finance K01–K10 kept in full (double-entry, journals/SKR03-SKR04, supplier bills and credit notes, VAT, reporting, DATEV, separate ledgers, Open Banking read-only first, reconciliation, multiple bank accounts). K06 starts as documented specification research; no production migration, no real bank, no real financial data without separate approval.
- Totals are recomputed by the panel generator from the real rows: 57 → 67. The old summary rows `I01–I04` and `L01–L07` were never counted (not real task ids); L01–L10 are ten real rows. The panel now also shows the pipeline (developed → CI passed → merged → deployed → production verified), each counted from the rows and GitHub, never from status words.
- Panel wording corrected: the Artifact is a snapshot that Claude regenerates and republishes at each task boundary; it does not update by itself.

### Outstanding owner decisions (collected)

| # | Decision | Unblocks |
|---|---|---|
| O1 | Run the V2 production checklist as owner, or schedule a session for it | A01, A04 |
| O2 | Accept isolated evidence for employee/client/manager acceptance, or create fictional production accounts | A02, A03 |
| O3 | Off-site backup provider, account, bucket, key (paid) per `docs/ops/OFFSITE_BACKUP_SETUP.md` | B01 (D2) |
| O4 | Rotate `RESEND_API_KEY` in the Resend dashboard and on `jihad` | B02 |
| O5 | Approve a Drive-side sharing audit with the Drive connector | B04 |
| O6 | Production upload limit value (`FILE_MAX_UPLOAD_BYTES` on `jihad`, ≤ 100 MiB) | C01, C02 |
| O7 | Merge decisions for #109, #110; migration window for #120 | G01, G02 |
| O8 | E-mail notifications to real clients (D01) and AI provider/cost (L) when those phases start | D01, L |
| O9 | Merge docs PR #133 (planning files) | G03 |
| O10 | Production window for B03 roles + `DATABASE_URL` + Keychain switch, after the rehearsal passes | B03 |
| O11 | Release approval for draft PR #134 (J07 no-store header; API redeploy) | J07 |
| O12 | Accept legacy Office binaries (`.doc/.xls/.ppt`) as uploads, or keep OOXML only; merge test PR #135 | C03 |
| O13 | Release approval for draft PR #136 (D02 work requests; API + web redeploy) | D02 |
| O14 | Release approval for draft PR #137 (E01 Team & Access; web redeploy) | E01 |
| O15 | Release approval for draft PR #138 (F01 invoice list on mobile; web redeploy) | F01 |
| O16 | Release approval for draft PR #139 (F02 plain-language errors; web redeploy) | F02 |
| O17 | Merge draft PR #140 (F03 test isolation; test only, CI effect only) | F03 |
| O18 | Read and merge docs PR #141 (M01 navigation audit) | M01 |
| O19 | Release approval for draft PR #142 (M02 sidebar regroup; web redeploy) | M02 |
| O20 | Collapsible sidebar groups (desktop OWNER list is 1661 px tall): implement, or accept page scroll | M03 |
| O21 | Merge draft PR #143 (E03 role-transition security gate; test only, CI effect only) | E03 |
| O22 | Approve adding `graphify-out/` to `.gitignore` (local tooling output) | G04 |
| O23 | Provide a read-only production path for the removed/test-account review (report only, zero writes) | E05 |
| O24 | J01: approve a `TenantSettings` ADR + migration task and name which company settings matter first (branding, sender name, locale/currency/timezone, defaults, cost rules) | J01 |
| O25 | D04 client side: extend the client read rule so a client may re-open versions previously delivered to its scope (comparison of rounds), or keep the portal on the current version only | D04 |
| O26 | Release approval for draft PR #144 (D04 version comparison; web redeploy) | D04 |
| O27 | Release approval for draft PR #145 (D03 client review deadlines + reminder job; API + web redeploy) | D03 |
| O28 | Release approval for draft PR #146 (E02 member access history; API + web redeploy) | E02 |
