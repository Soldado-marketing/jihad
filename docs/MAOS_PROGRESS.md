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

## 2026-11-03 — Unfinished details verified (owner directive §4), K06 research, G05 analysis

- **D02:** gap confirmed — `/client/requests` existed only by URL on `feat/client-work-requests` (no client menu entry, no overview link). Fixed on the same branch (`2cd29ea`, PR #136): fifth client section "Requests" + "Request new work" link on the overview; portal test expects five sections; web 292/292 on the branch.
- **D03:** suite extended (`d5a7453`, PR #145, 8/8 on a disposable PG18): duplicates (second run adds nothing), wrong tenant (company B reminds only its own client; same scope key in two companies), approved and changes-requested rounds skipped, and now a **cancelled** round (replaced by a resubmission, still carrying its review-by time) is never reminded while the new round is, once.
- **D04:** no new code. Previously delivered versions stay behind `FileVersionsService.assertClientMayRead` (client scope key compared first, then visibility, then approved/under-review): evidence `security-gate-client-deliveries` "client Y and another company never see it" (content → 403) and `security-gate-client-isolation`. Comparison UI is staff-only (#144).
- **E01/E02:** overlap is a real content conflict (`git merge-tree origin/feat/team-access origin/feat/member-audit-history` → CONFLICT in `apps/web/app/(workspace)/dashboard/admin/company-access/page.tsx`). Resolution recorded on E02: the second PR to merge moves the import and the `<MemberHistory>` hook into `src/components/team/company-access-panel.tsx`; to be done before release.
- **J01** stays gated (O24, TenantSettings ADR + migration); **D05** stays gated (schema: multi-file delivery).
- **K06:** `docs/finance/MAOS_DATEV_EXPORT_SPEC_K06.md` — EXTF Buchungsstapel verified from public DATEV documentation (header 31 fields, 125 booking columns, 5 mandatory fields, Windows-1252, decimal comma, TTMM dates, S/H rule, account-length errors REW10152/53); MAOS gap table (no accounts, no VAT, no journal, no company DATEV master data); five-step implementation plan after K01/K04; decisions O29 (file vs API), O30 (SKR, account length, debtors).
- **G05:** `docs/MAOS_PLATFORM_GAPS_G05.md` — what MAOS already covers, 26 gaps vs Trello/ClickUp/Notion with Blueprint placement, size and gate; two items do-not-build (§28/§43.4); minimum replacement set and order; decision O31 to add the proposed rows.
- Local note: the code worktree's E02 branch was briefly hard-reset to the D02 head while switching branches (the D02 branch is checked out in another worktree); restored from `origin/feat/member-audit-history` (`c7815e9`). No remote branch or PR was harmed.

## 2026-11-03 — G06 finance alignment note

- `docs/finance/MAOS_FINANCE_ROADMAP_ALIGNMENT_G06.md`: the Phase 8 finance spec is the operational layer, K01–K10 the accounting layer underneath (journal, accounts, VAT, documents, banking read-only, DATEV); five alignment rules; schema gates named. Panel: docs/research/tooling rows now appear as DONE (docs/tooling) and never count as production verified.

## 2026-11-03 — Release train #147 (owner directive: finish the unfinished work, one approval)

- Fourteen open PRs were each clean against `main` but conflicted with one another. Branch `release/train-2026-11-03` (PR #147) merges them in age order with every conflict resolved once: #109, #110 (ledger kept from `main`), #133, #134, #135 (CI list), #136 (with the D02 menu fix), #137, #138, #139, #140, #141, #142 (M02 sidebar wins over the E01 slot), #143 (CI list), #144, #145 (CI list, with the cancelled-round test), #146 (History panel moved into `src/components/team/company-access-panel.tsx`).
- Integration fixes that existed in no single PR: the three admin ids replaced by E01 leave the sidebar glyphs and the Company & Team group (now Team & Access + Audit Log); `isNavItemActive` simplified; tests `sidebar-groups`, `team-access`, `member-history` follow. `.github/workflows/ci.yml` keeps all four integration-batch additions.
- **Excluded:** #120 (board lists, migration A) — needs a migration window (O7). Stays BLOCKED.
- Evidence on the train head `aba3f60`: web typecheck + `next build` clean, web **348/348**; API build clean, unit **572 pass** (10 todo); on a disposable PostgreSQL 18 (`maos-train-pg`, removed): `integration-api` exit 0, then the 47-file CI batch **487/487**. GitHub CI on #147 running at this checkpoint.
- Release procedure once the owner approves (one message for #147): fresh production backup with sha256 + `pg_restore --list` + isolated rehearsal → `gh pr merge --merge --match-head-commit` on the exact head → Railway deploy of `jihad` and `maos-web` verified → readiness 200 → unauthenticated/forged-token smoke (expect 401 on API routes, 200 on the new pages `/team/members`, `/client/requests`, `/files/[id]`) → PASS/FAIL recorded here, production columns updated, panel republished. No migration in the train.
- GitHub CI on #147 head `aba3f60`: SUCCESS on all four checks (API: unit 467/467, integration-api 39/39, integration batch 487/487, full suite 572 pass/10 todo, operator scripts 16/16; web; dependency audit; graphify); merge state CLEAN. Checklist posted on the PR. A CI-monitor switch was refused by the tool policy, so CI was read from the run log by hand.

## 2026-11-03 — RELEASE: train #147 merged and deployed (owner approval O32)

**Sequence (all evidence on the exact head `aba3f60`, merge commit `e301574`):**
1. CI reconfirmed on `aba3f60`: API (unit 467, integration-api 39, batch 487, full 572/10 todo, operator scripts 16), web, dependency audit, graphify — SUCCESS; merge state CLEAN.
2. Train diff against `main`: no change under `apps/api/prisma/` — **no migration, no destructive operation**; Docker/Railway config untouched.
3. Backup through Railway's private tunnel (Keychain credential, runner `scripts/nightly-backup.sh`, tunnel port 15433): `maos-20261103T122203Z.dump` (202,489 bytes), sha256 OK; `scripts/restore-rehearsal.sh` on a network-less PostgreSQL 18 container: **REHEARSAL OK** (15 migrations, 48 tables; e.g. Tenant 1, User 4, TenantMembership 4, Task 5, Payment 2).
4. Production baseline before merge: API health/ready 200; web `/` 307 → `/dashboard`.
5. `gh pr merge 147 --merge --match-head-commit aba3f60` → `main` = `e301574` at 12:24Z. GitHub marked #109, #110, #134–#146 MERGED automatically (their commits are in `main`). #133 stays open with the later checkpoint commits only.
6. Railway: `jihad` a6770bc0 and `maos-web` f02bdeef built from `e301574` → both **SUCCESS** (API started 12:25Z; scheduler lists the four jobs incl. `client-review-reminders@1800000ms`; web "Ready"). No error lines in the recent logs of either service.
7. Production smoke (`smoke.sh`, unauthenticated/forged only): API health 200/200; 20 protected routes → 401; forged JWT on 5 routes → 401; `Cache-Control: no-store` present (J07); 11 pages served 200 incl. new `/team/members`, `/team/invitations`, `/team/requests`, `/client/requests`; old admin routes answer 200 with a client-side `NEXT_REDIRECT` to `/team/*` (verified in the payload). The five "FAIL" lines of the script were expectation errors, not regressions: `/login` does not exist (also 404 before the release; sign-in lives at `/`), `GET /api/admin/users` has no handler (404; `/api/admin/users/requests` → 401), and the three redirects are client-side rather than HTTP 3xx.

**Per task (owner format):**

| Task | PR | CI | Deployment | Production verification |
|---|---|---|---|---|
| J07 no-store | MERGED (#134 in #147) | PASS | SUCCESS | PASS (header observed on production) |
| C03 format tests | MERGED (#135) | PASS | SUCCESS (no behaviour) | n/a (CI-only) |
| D02 client work requests | MERGED (#136) | PASS | SUCCESS | PASS unauthenticated (`/client/requests` served, API refuses anonymous) · signed-in flow NOT VERIFIED |
| E01 Team & Access | MERGED (#137) | PASS | SUCCESS | PASS unauthenticated (new routes served, old routes redirect) · signed-in NOT VERIFIED |
| F01 invoice list mobile | MERGED (#138) | PASS | SUCCESS | page served · 375 px look NOT VERIFIED |
| F02 plain-language errors | MERGED (#139) | PASS | SUCCESS | NOT VERIFIED (needs a signed-in error case) |
| F03 reminder test isolation | MERGED (#140) | PASS | n/a | n/a (CI-only) |
| M01 navigation audit | MERGED (#141) | PASS | n/a | docs |
| M02 sidebar groups | MERGED (#142) | PASS | SUCCESS | NOT VERIFIED (sidebar needs a signed-in user) |
| E03 role-transition gate | MERGED (#143) | PASS | n/a | n/a (CI-only) |
| D04 version comparison | MERGED (#144) | PASS | SUCCESS | `/files` served · comparison NOT VERIFIED (needs stored files) |
| D03 review deadlines + reminder job | MERGED (#145) | PASS | SUCCESS | job registered in production (scheduler log) · client view NOT VERIFIED |
| E02 member access history | MERGED (#146) | PASS | SUCCESS | route refuses anonymous/forged · OWNER view NOT VERIFIED |
| F-6 rate/cost module (#109), UX audit docs (#110) | MERGED | PASS | SUCCESS | no user-visible change |

**Not done:** #120 (board lists, migration A) — BLOCKED, needs a migration window (O7). Signed-in production verification (login, permissions, company isolation, client portal, team management, invoices as a user) — **NOT VERIFIED**: no authorized production account is available to this session; the owner walk-through (O1) covers it. Rollback path if needed: `git revert e301574` on `main` (code only; the database is unchanged by this release).

**Decisions closed by this release:** O9, O11–O19, O21, O26–O28, O32 and the #109/#110 part of O7.

## 2026-11-03 — O1 acceptance walk-through of `e301574` (isolated stack, fictional data)

- Full stack built locally from `main` (PostgreSQL 18 + MinIO + API with scheduler + `next dev`), two fictional companies, OWNER/MANAGER/EMPLOYEE/CLIENT accounts, browser at 1024 px and 375 px. **24 workflows PASS** (login, dashboard numbers, sidebar groups, Team & Access tabs, grants, member History, audit log, versions + comparison, delivery with review-by + reminder job, company switching with a different role, invoice list on a phone, client portal incl. requests entry, delivery review and revision, work request to management, invoice detail, isolation matrix 17/17 across clients and companies, employee and manager scope). Record: `docs/MAOS_O1_ACCEPTANCE_2026-11-03.md`.
- **Finding fixed:** `/client/requests` carried the problem-report wording → PR #148 (web only, 349/349), awaiting one release approval (O33).
- **Production blocker (exact):** this session has no authorized production session and production test accounts need approval (O2); signed-in production verification therefore stays NOT VERIFIED. Rows D02, D03, D04, E01, E02, F01, F02, M02, J07 are DONE with isolated acceptance; A01 PARTIAL.
- Stack removed afterwards (containers, env files, launch config); nothing committed from it.

## 2026-11-03 — #148 released (owner approval O33)

- CI on head `c756497` SUCCESS (API, web, audit); no Prisma change. Merged `ff21ca6` (GitHub answered a 504 on the first call; the merge had gone through). Railway: `maos-web` SUCCESS on `ff21ca6`, `jihad` SKIPPED (web-only change, as expected). Readiness 200; `/`, `/client/requests`, `/team/members` served 200; the compiled route chunk served by production for `/client/requests` contains the new wording ("Need something new from us", "What do you need?") and not the problem-report text (the page is client-rendered, so the HTML itself carries no copy).
- D02: wording finding closed. Signed-in production verification of the page stays NOT VERIFIED (O1/O2).

## 2026-11-03 — #120 (board lists, migration A) prepared for a window

- Branch `feat/board-lists` merged with `main` after the release (`d3ca32a`); three conflicts resolved keeping both behaviours; test fixture aligned with the #126 employee scope (no production rule change). API unit 572, web 372/372, local integration batch green apart from the bootstrap suite that CI runs alone.
- Migration `20261029202156_task_lists` exercised on a restored copy of today's production backup (isolated container): apply → no drift → documented rollback SQL → re-apply; task checksum identical at all four points; `TaskList` and `Task.listId` present after apply, absent after rollback. Production untouched. Plan for the window and the rollback (application revert + SQL) recorded in `docs/migrations/PROJECT_BOARD_LISTS_GATE.md`.
- Waiting on O7: owner migration window. Then: fresh backup → `scripts/migrate-deploy-one.sh` through the private tunnel → merge #120 → Railway deploy → smoke.
- Also today: ADR-019 (TenantSettings, J01 → O24) and ADR-020 (multi-file delivery, D05 → O34) proposed; A04 evidence state recorded.

## 2026-11-03 — H01 product-name research (docs only)

- `docs/branding/MAOS_PRODUCT_NAME_RESEARCH_H01.md`: five criteria, eight candidates screened against existing software/company names by web search, three rejected as descriptive or taken, shortlist **Klarwerk, Taktwerk, Studiokern** for H02 (DPMA/EUIPO/WIPO, whois, stores, handles — read-only). Nothing bought or registered.

## 2026-11-03 — H02 availability lookups (read-only)

- `whois` for Klarwerk, Taktwerk, Studiokern on `.de`, `.com`, `.app`: **all nine registered by others**. Web search finds no software product or mark for any of the three; DPMA/EUIPO/WIPO registers were not searched (interactive). Nothing registered or bought. Decision O35: accept a variant domain for one of the three or run a second naming round; H03 waits on it.

## 2026-11-03 — #120 window executed (owner approval O7)

- CI on head `d3ca32a` SUCCESS; fresh backup `maos-20261103T140958Z` (sha256 OK, REHEARSAL OK: 15 migrations, 5 tasks); `scripts/migrate-deploy-one.sh check` → CHECK OK (only `20261029202156_task_lists` pending, sha256 `bbf172e4…`); `apply` through the private tunnel → APPLY OK, schema up to date; the still-running old API answered 200/200/200 after the migration (backward compatible: nullable column + new table).
- Merged `3baaad7`; Railway `jihad` and `maos-web` SUCCESS on `3baaad7`; readiness 200; new routes refuse anonymous callers (`/projects/:id/lists` 401, `/tasks/reorder` 401); pages served 200; no error lines in API logs. Main CI running at checkpoint.
- **INCOMPLETE:** functional test of the board lists and of existing workflows on the released code (isolated stack walk-through) was not run — the session's usage limit was reached right after the deployment. Rows G01/G02 stay NOT VERIFIED for the board feature; rollback path if needed: revert `3baaad7` on `main` (code) and the rollback SQL in `docs/migrations/PROJECT_BOARD_LISTS_GATE.md` (loses list data only).

## 2026-11-03 — G01/#120 closed: board lists verified on the released code

- GitHub CI on `main` `3baaad7` SUCCESS. Isolated stack rebuilt from `3baaad7` (PostgreSQL 18, MinIO, API + web, fictional companies): **13/13 checks PASS** — board opens without writes, setup creates the five mapped lists without touching tasks, custom list, add card, moves to mapped (status follows) and unmapped (status kept) lists, persistence after reload, rename/reorder/archive/restore with audit events, employee sees no structure controls but moves the own card, API permissions (client 403, employee read-only, manager full) and tenant isolation (company B 404 on every Nord list and move), existing task board / My Work / client portal unchanged, phone layout without page overflow. Record: `docs/MAOS_O1_ACCEPTANCE_2026-11-03.md` (section "#120 board lists").
- No defect found; nothing changed in production after the release. G01 and G02 closed; signed-in production verification of the board stays NOT VERIFIED (O1/O2).

## 2026-11-03 — O1/O2 done: authenticated production walk-through with fictional accounts

- Owner approval O2 (fictional production test accounts). Fresh backup `maos-20261103T155001Z` first. Two fictional companies and seven fictional accounts with fictional customers/projects/tasks/file/invoices created in production through the private tunnel (additive; real company untouched), **53/53 checks PASS** at the API level: logins, owner scope, board lists (#120) end to end, file upload to the production bucket and permission-checked download, delivery with review-by and client decision, client portal and isolation across clients and companies, role permissions, member history, company switching with session re-issue. Record: `docs/MAOS_O1_ACCEPTANCE_2026-11-03.md` (section "O1/O2").
- Everything created was removed afterwards (file via API → object purged; audit rows, login history, both tenants, seven users via the tunnel with guards); counts back to 1 tenant / 4 users / 5 tasks / 1 invoice, zero leftovers. The random secret existed only in a local file and was deleted.
- Not run: the signed-in browser UI on production — doing so would require a password or session token inside a recorded tool call, which the "never expose credentials in chat" rule forbids (the tool policy also refused materialising the token). The identical commit's UI was verified on the isolated stack (24/24 + 13/13). A01–A04 closed; O1 and O2 closed.

## 2026-11-03 — Roadmap v2: full development tree (owner directive A–Z)

- Phase 0 audit done against `main` `3baaad7` (live on both Railway services): 67 rows reconciled by evidence; 87 rows added for every blueprint capability the list did not cover (A05–A09, B06–B10, C05–C08, D06–D08, E06–E08, F04–F07, G07–G20, J08–J11, K11–K14, M05–M12 and new departments N CRM, O services/packages, P operations/people, Q content/social, R automation/knowledge/system) → **154 rows**. Dependency tree, phases 0–10 with exit criteria, per-workstream acceptance and the consolidated decision list with recommendations: `docs/MAOS_MASTER_DEVELOPMENT_TREE.md`.
- Panel generator: departments A–Z, new status vocabulary (NOT STARTED / IN PROGRESS / IMPLEMENTED / TESTED / READY FOR RELEASE / BLOCKED — OWNER / DEPLOYED / VERIFIED / DONE), active-phase line.
- First implementation task: **B06 operational alerts to the OWNER** (no gate, no schema). Then B08, B09, B10, A08, A09; then C05/C06/F04 while the Phase 2 gates (O8, O24, O34, O39) are decided.

## 2026-11-03 — B06 operational alerts implemented (PR #150)

- Branch `feat/ops-alerts` from `main` `3baaad7`, commit `4ae3ee6`: `ops-watchdog` job (failed or silent jobs → one in-app notice per owner of every active company, INTERNAL audience), `storage-capacity` job (read-only `ListObjectsV2` inventory vs `MAOS_STORAGE_ALERT_BYTES` 5 GiB / `MAOS_STORAGE_ALERT_OBJECTS` 50,000, one notice per day), `GET /health/ops` OWNER-only status. `JobStatus.everyMs` added. No schema change.
- Evidence: `test/ops-alerts.test.mjs` 5/5 and `scheduler.test.mjs` 6/6 on a disposable PG18; API unit 572 pass; typecheck clean; Graphify refreshed (three new nodes, dependencies on scheduler/storage/notifications/prisma only). Full local batch and GitHub CI running at checkpoint.
- Release needs one approval (O50: merge #150, API redeploy, no migration). Next Phase 1 engineering: B08 blocking audit + secret scan, B09 isolation gate job, B10/A08 runbooks + rollback drill, A09 e2e smoke.

## 2026-11-03 — B06 batch green; B08 dependency advisories in progress

- B06 (#150, `40e0f11`): the first full batch exposed a design flaw — operational notices were broadcast to the owners of every active company (another agency would have learned about this platform's jobs and storage); fixed: notices go to the OWNERs of the platform's own company (`MAOS_OPS_TENANT_SLUG`, else the oldest active company). Full batch on a disposable DB: 1497 pass, only the bootstrap suite (which CI runs alone) differs. GitHub CI: web green, API running at checkpoint.
- B08 (`fix/dependency-advisories`, own worktree `b08-deps`): `npm audit` showed a **critical** advisory in the web app's Next.js 15.5.27 (unauthenticated RCE in image optimisation, GHSA-2464-fhr4-w9xw) and highs in postcss/browserslist and, for the API, multer/body-parser (via `@nestjs/platform-express`) and deepmerge-ts (via prisma's CLI config). Fixed without major upgrades: `next` 15.5.29, `postcss` 8.5.32, npm `overrides` for browserslist, multer 2.5.0, body-parser, deepmerge-ts 8. Production-dependency audit now 0/0/0/0 in both apps. CI gains a blocking audit (high, production deps) and a gitleaks secret scan. Builds and full test suites running at checkpoint; release needs one approval (API + web redeploy, no migration) — to be batched with #150 (O50).

## 2026-11-04 — B06 and B08 ready for release; B09 isolation gate tested

- **B06** #150 (`40e0f11`): CI green (API, web, audit); evidence comment posted. READY FOR RELEASE under O50.
- **B08** #151 (`086d6d3`): all five CI jobs green including the new blocking production-dependency audit and the gitleaks secret scan (the repository owner is a user account, so the action needs no licence; pinned to a commit). The Sprint 2 baseline test asserted one exact Next version and was changed to "at least 15.5.29 on the 15.5 line". READY FOR RELEASE under O50 (API + web redeploy, no migration).
- **B09** #152 (`6053085`, stacked on #151): new CI job `isolation-gate` runs the 20 tenant/client/role/session isolation suites and two storage-privacy unit suites on their own PostgreSQL; the suites left the API batch so nothing runs twice. Finding: `client-scope-inheritance.test.mjs` (merged 2026-11-02 with the client-portal fixes) was never listed in CI and had not run there until now — it passes. Local run on a disposable database: 266/266 integration, 33/33 unit, 0 skipped. `docs/security/TENANT_ISOLATION_INVARIANTS.md` written. TESTED; CI on the PR runs the job itself.
- **A09** split: the merge gate half exists (three blocking jobs); whether GitHub *requires* them before merge is a branch-protection setting only the owner can change (O51). The Playwright e2e smoke remains to build.

## 2026-11-04 — B09 ready for release; B10/A08 runbooks and drills (PR #153)

- **B09** #152: CI green on all five jobs, the new `Isolation gate - tenant, client and role boundaries` included → READY FOR RELEASE (CI-only; lands with the O50 batch after #151).
- **B10/A08** PR #153 (`docs/ops-runbooks`, docs only): `docs/ops/INCIDENTS.md` (R1 API down, R2 database down, R3 bad deploy, R4 jobs silent, R5 storage, R6 backup Mac lost, R7 credential leak with the rotation table proven 2026-10-31, R8 suspected isolation leak) and `docs/ops/RELEASE_ROLLBACK.md` (pre-release checks, plain release, migration window, application rollback, database rollback, restore from backup, RPO 24 h / RTO target 1 h, drill record).
- **A08 drills, isolated, fictional data only:** (1) `git revert --no-commit -m 1 3baaad7` applies cleanly (32 files) — finding: a revert of a release that carried a migration deletes the applied migration's folder, which makes `prisma migrate status` report it missing and `migrate-deploy-one.sh` refuse later migrations; the runbook keeps the folder by default. (2) Rollback SQL of `20261029202156_task_lists` on a disposable PostgreSQL 16 seeded by the `task-lists` suite (5 tasks, 13 lists, 3 cards in lists): 16 → 15 → 16 migrations, `TaskList`/`Task.listId` gone and back, task checksum `5:99656205…` identical at all three points, `prisma migrate diff` no difference. (3) Railway redeploy of a previous deployment: not rehearsed — production action, needs an owner window or the staging decision (O52).
- Disposable containers removed; no production access in any of this.

## 2026-11-04 — O50 release, part 1: #151 and #152 on main

- Pre-checks: all three PRs CLEAN and green on their exact heads; no migration in any diff; production health/ready 200 before the window. Known-good deployments recorded: API `78010e75`, web `e3729f52` (both `3baaad7`).
- Fresh backup `maos-20261103T212359Z.dump` through the private tunnel, sha256 written, isolated restore rehearsal PASS (16 migrations).
- **#151 (B08)** merged → main `39837d1`; Railway API `be2ed7ff` and web `41fd1502` SUCCESS; smoke: `/api/health` 200, `/api/health/ready` 200, web root 200, `/auth/login` 200. Not checked: authenticated flows (no fictional production accounts exist since the O1/O2 cleanup) → authenticated smoke stays NOT VERIFIED.
- **#152 (B09)** retargeted to main (GitHub does not retarget while the base branch exists), checks green, merged → main `f0b6d62`; redeploy of the unchanged application in progress.
- **#150 (B06)**: `origin/main` merged into `feat/ops-alerts` without conflicts (`1a46841`); CI including the new `isolation-gate` and `Secret scan` jobs running before the final merge.

## 2026-11-04 — O50 release, part 2: #150 on main; release complete

- **#152 (B09)**: Railway skipped both services (CI/docs only, `468c1aa8` / `7f885139` SKIPPED) — expected; production stayed on the #151 build.
- **#150 (B06)**: `origin/main` merged into the branch (`1a46841`), CI green on all five jobs including the isolation gate, merged → main `e2bb560`. Railway API `5c664bd2` SUCCESS; web correctly skipped (no web change), stays on `41fd1502`.
- Smoke after the API deploy: `/api/health` 200, `/api/health/ready` 200, `/api/health/ops` 401 anonymous (the new endpoint is live and guarded), web root 200, `/auth/login` 200.
- **Not verified:** `/api/health/ops` as OWNER and the first watchdog run in production — needs an owner session or a fictional production account (O36). The watchdog runs every 15 min; a failed or silent job will notify the OWNERs of the oldest active company (`MAOS_OPS_TENANT_SLUG` not set).
- Production now: main `e2bb560` (B06 + B08 + B09 + #120). Known-good for rollback: API `5c664bd2`, web `41fd1502`; previous API `be2ed7ff`.
- Rows: B06 VERIFIED, B08 VERIFIED, B09 VERIFIED. O50 closed. Open PR: #153 (docs, B10/A08).

## 2026-11-04 — Owner rule: quality and verification before speed (permanent)

The owner set a permanent rule for every remaining MAOS task: (1) review requirements, existing code, GitHub history and Graphify dependencies; (2) verify the architecture is correct and compatible; (3) name security risks, missing requirements and integration conflicts before coding; (4) implement and test completely, edge cases and tenant isolation included; (5) fix root causes; (6) verify CI, integration tests and Graphify; (7) DONE only when all acceptance criteria hold, deployment and production verification included where authorized. Never build on a broken or incomplete dependency; do not rush or accumulate unfinished PRs; BLOCKED with one essential approval request when authorization is needed. Recorded in `docs/MAOS_RESUME.md` STANDING_RULES. First task under the rule: A09.

## 2026-11-04 — A09 browser smoke (PR #154), first task under the quality-first rule

- **Review before coding:** requirements (A09 row), sign-in and session code (`login/page.tsx`, `lib/auth.ts`, `lib/api.ts`, both layout guards), API startup/CORS/invite behaviour, CI structure, repository history (no earlier e2e), graph (auth path). Findings used in the design: login body is `{ email, passwordOrMagicCode }`; `inviteUrl` is returned only without a mail provider; login throttle allows the suite's three sign-ins; Next's route announcer is a second `role=alert`; `tsconfig` typechecks `e2e/*.ts`; static web suites scan `app/` and `src/` only. Side observation (not a defect, recorded): the client layout checks authentication only, so staff can open `/client`; the workspace layout does send CLIENTs away from internal routes.
- **Built:** `apps/web/e2e/` (fixtures create a fictional company, OWNER, customer and CLIENT through the public API with per-run random credentials; 4 serial tests: unauthenticated redirect, wrong password refused, OWNER dashboard → projects → files with the stored company checked, CLIENT portal-only with no internal links and redirects from internal URLs), `playwright.config.ts` (retries 0, traces on failure), CI job `e2e-smoke` (API dist + production web build on the runner, Chromium, evidence artifact on failure), `@playwright/test` dev dependency, new `apps/web/.gitignore` for Playwright output.
- **Verified locally** on a disposable PostgreSQL 16: migrate, API ready, production web build, 4/4 pass; typecheck clean; static web suite 372/372. The one failure during development was an ambiguous test locator, fixed in the test; the app behaved correctly.
- Pushed over HTTPS with the GitHub CLI credentials because the SSH agent on this Mac had lost its key mid-session (no secret involved; `ssh -T` still authenticates).
- TESTED; CI on #154 runs the new job. DONE only when the job is green on the PR and merged (CI-only, no deploy).

## 2026-11-04 — A09 CI green on the first run

- PR #154: API 3m48s, **Browser smoke 2m19s**, Isolation gate 1m11s, Web 1m21s, Dependency audit, Secret scan — all pass on the first run (retries 0). A09 is READY FOR RELEASE; the merge is CI-only (no deploy, no migration) and waits for one owner message (O53). After it, every PR runs six blocking jobs; making them *required* in GitHub is O51.

## 2026-11-04 — A09 extended to the full acceptance; security finding fixed at the root

- **Owner correction:** A09 was not complete against the acceptance criteria (four roles, isolation, permissions, tasks, boards, invoices, files, client workflows, desktop and mobile; investigate employee access to `/client`). Work continued under the quality-first rule; C05 not started.
- **Finding (security):** the client-portal routes applied no client filter for internal roles. Probe on an isolated stack: a CONTRACTOR with 0 internal projects/tasks received 2 projects, 2 tasks and 1 appointment through `/api/client/*`; an EMPLOYEE received tasks beyond assigned work. Root cause `ClientScopeService.resolve()` → null for every non-CLIENT role. **Fix** (`86e8d63`): EMPLOYEE and CONTRACTOR are refused (`403 portal_requires_client_scope`); OWNER and MANAGER keep the tenant-wide preview the gate protects; the web portal layout sends EMPLOYEE/CONTRACTOR to `/dashboard`. New gate cases in `security-gate-client-isolation`; invariant 2.10 in `docs/security/TENANT_ISOLATION_INVARIANTS.md`. Isolation gate + portal suites: 317/317.
- **Suite** (`20cc96e`): one seeded world per run through the public API (plus a second company seeded directly, since bootstrap serves only the first); sessions taken once per person from distinct addresses behind `TRUST_PROXY_HOPS=1` (the 10/min login throttle stays in force); specs 01-auth … 06-isolation on Desktop Chrome and Pixel 7; in-memory S3 stub for uploads (MinIO is archived — downloads and images gone). Local: 28/28 in 20 s; API unit 572/572; web 372/372; typecheck clean. PR #154 description and evidence comment updated.
- **Status:** A09 TESTED; DONE only after CI is green on `20cc96e` and the PR is merged and deployed (API + web change). #153: tabletop and Railway redeploy rehearsal remain **not done** (O52).

## 2026-11-04 — A09 CI green on the final head; O53 requested

- PR #154 `20cc96e`: API 3m59s · Browser smoke 2m01s (28 tests, desktop + mobile) · Isolation gate 1m17s · Web 1m14s · Dependency audit · Secret scan — all pass, first run on this head, retries 0. Graphify refreshed.
- A09 READY FOR RELEASE. The PR carries the portal security fix, so the merge deploys API + web (no migration). #153 (docs) stays with its tabletop and redeploy drill explicitly not done (O52).

## 2026-11-04 — Owner correction: strict execution and one-task policy (permanent)

The owner rejected the A09 "READY FOR RELEASE" report: the first PR head carried four browser tests while most acceptance requirements were uncovered, and the extended head was still reported without an acceptance matrix. Permanent rules recorded in `docs/MAOS_RESUME.md` STANDING_RULES: acceptance checklist from the original specification before every task; independent comparison before closure; complete = implemented + integrated + all test classes passing + CI green + Graphify reviewed + bugs resolved + merged/deployed/verified when authorized + checklist satisfied + panel/checkpoint updated; otherwise INCOMPLETE or BLOCKED; one task at a time; no scope reduction without recorded justification; functional tests, not page loads; no merge-approval request before the checklist is met. A09 continues under these rules; C05 is not started.

## 2026-11-04 — A09 completed to the acceptance checklist; BLOCKED — OWNER for merge/deploy

- Checklist written first (`docs/MAOS_A09_ACCEPTANCE.md`, 20 rows) from the A09 row and the owner's criteria; gaps found against the previous head: no UI state changes (page-level reads only), no manager/employee actions, no revision/appointment/request client flows, no write-permission checks, no API permission matrix.
- Closed with functional tests (`b1c2c77`, 74 tests = 37 desktop + 37 mobile): OWNER creates project, board list, card in the list, task, file version 2, invoice (each checked at the API); MANAGER creates a customer, refused finance/audit/invitations; EMPLOYEE changes the assigned task's status from the editor (stored), refused the portal and every management write, internal tasks = assigned only; CLIENT approves one delivery (image served by the client content route), sends another back with a note the company sees, reads invoice + PDF, confirms the appointment, requests new work that reaches management and is refused to the employee; second client and other company's owner get 404/403 on pages and API for reads and writes; permission matrix 14 routes × 4 roles.
- Test-only fixes during the runs (none in the application): login throttle → seeded sessions from distinct addresses; the task editor unmounts its Create button on success (submit with Enter) and keeps the editor open after Save (assert the board column); the invoice list omits the scope key (read the invoice); the client content route refuses with 403, record routes with 404; the editor's compact "Save" on narrow screens.
- CI on `b1c2c77`: API 4m04s, Browser smoke 3m27s, Isolation gate 1m10s, Web 1m12s, Dependency audit, Secret scan — all green. Graphify refreshed (10,753 nodes); resolver dependents reviewed: all portal paths.
- **Status: BLOCKED — OWNER.** Everything the repository can satisfy is done and verified. Completion needs: O51 (GitHub required checks) and O53 (merge #154, API + web deploy, production verification). No merge request is made until the owner confirms the checklist. #153 keeps its tabletop and redeploy drill open (O52). No other task started.

## 2026-11-04 — O53 release of #154 (A09 + portal fix)

- Pre-checks: head `15979ad`, six CI jobs green, 23 files, no migration, graph built from `15979ad`; production baseline health/ready 200; known-good API `5c664bd2`, web `41fd1502`.
- Backup `maos-20261104T231824Z` through the private tunnel, isolated restore rehearsal PASS (16 migrations).
- Merged → main `30125fe`. Railway API `a6e7127c` and web `004af8cf` SUCCESS. Smoke: health 200, ready 200, web 200, `/auth/login` 200. Security behaviour, anonymous: `/api/health/ops`, `/api/client/projects|deliveries|tasks`, `/api/projects`, `/api/auth/me` → 401; bootstrap refuses; HSTS, X-Frame-Options DENY, CSP report-only present. Graph on the merged tree (identical to `15979ad`).
- **NOT VERIFIED in production:** authenticated behaviour (employee refused on the portal, the four role flows) — no authorized production account (O36). Evidence for it: the isolated-stack suite (74 browser tests) and the isolation gate, both green in CI.
- **A09 status: DEPLOYED; BLOCKED — OWNER** (O36 authenticated verification, O51 required checks). Not marked DONE, per the owner's rule that CI and unauthenticated smoke are not enough. O53 executed; #153 untouched (not in the approval).
- Rollback if needed: Railway redeploy API `5c664bd2` / web `41fd1502`, or revert `30125fe` on main (no migration involved).

## 2026-11-05 — O36: authenticated acceptance of A09 on the deployed production version

- Owner authorised temporary fictional production accounts and isolated test data for A09. Method (the O1/O2 pattern): `prod-seed.mjs` through the private tunnel created two fictional companies (`a09-mw2r47275e87`, `a09b-…`), OWNER/MANAGER/EMPLOYEE/two CLIENTs with customers in the first and an OWNER + client-visible project in the second (random passwords in a mode-600 file, never printed); the browser suite in its new existing-environment mode (`ef1ff5c`, PR #155) built projects, board, tasks, appointment, invoice and two deliveries through the production API and ran against the production web and API.
- **Result: 74/74 on production** — 37 desktop + 37 mobile: four roles, permissions (14×4 matrix), client and company isolation, project board, tasks, files (upload + delivery + client content), invoices (+ PDF), appointments, client workflows (approve, revision, confirm, request), and the security fix (employee refused on every portal route and sent to the dashboard). 3.0 minutes.
- **Cleanup:** 4 files deleted through the API (storage objects go with them; 0 storage keys left), audit 58 + login-history 13 rows of the fictional actors, 2 tenants (cascade), 6 users; counts after = seed-time baseline exactly (tenants 1, users 4, customers 0, projects 2, tasks 5, invoices 1, files 2, approvals 1); leftovers 0. Credential file, session file, traces and report deleted; the kept log contains no secret (its two "password" mentions are test titles).
- CI on the deployed commit `30125fe`: six jobs success; PR #155: six jobs success on `ef1ff5c`. Graphify built from the deployed tree. Suite regression in isolated mode after the tooling change: 74/74.
- **A09 status: VERIFIED.** DONE once PR #155 is merged — one owner approval (O54). O51 remains a separate security task. No other task started.

## 2026-11-05 — O54: #155 merged; A09 DONE

- Pre-checks: head `ef1ff5c`, six CI jobs green, diff = test tooling only. Merged → main `5f12968`. Railway: API skipped (no API change), web rebuilt `26e59add` with unchanged application code; smoke after: health/ready 200, ops and portal 401 anonymous, web and sign-in 200. Main CI on `5f12968`: six jobs success. Graphify built from `5f12968`.
- **A09 DONE** — every item of `docs/MAOS_A09_ACCEPTANCE.md` PASS, including authenticated production verification. Open items outside the task: O51 (required checks, owner security task), O52 (#153 drills), O22 etc.
- Next task starts with its own acceptance checklist (one-task policy).

## 2026-11-05 — C05 implemented and verified on the isolated stack; BLOCKED — OWNER for merge/deploy (O55)

- Checklist first (`docs/MAOS_C05_ACCEPTANCE.md`, 20 rows from the task row + owner rules), then the audit on main `5f12968`: downloads are proxied through the API with no `Range` handling (200 + full body, no `Accept-Ranges`; Safari/iOS refuse to play without a 206 answer to `bytes=0-1`); the workspace file page previewed images/PDF only; a client's video copy was read whole, concatenated and copied again (253 MiB peak for a 100 MiB delivery, measured); an EMPLOYEE got 200 on `/api/client/files/.../content` (no extra bytes, but the A09 portal rule was not applied there).
- Fix, PR #156 (`feat/c05-video-playback`, head `040317f`): `storage/byte-range.ts` (single-range parse, clamp, 416, ignorable forms → 200), `StorageService.getObjectStream(key, range)` with store `Content-Range` validation, `openDownload(..., rangeHeader)` → 206/416 + `Accept-Ranges` on both routes, `Mp4ClientCopyStream` (forward-only box walk, `udta/meta/XMP` → `free` + zeros, byte window, early stop; equivalence proven against the buffered neutraliser over 8 structures × 5 chunkings), the release check before a delivery uses the same walk without keeping bytes, `ClientFilesController` runs the client-scope resolver for non-CLIENT roles, web `previewKind` → `video`, compare pane `<video>` and a lone version shown inline, Preview button for MP4/MOV. The S3 stub moved to `apps/api/test/support/` (importable). Fixture: 22 KB real H.264 clip; 25/100 MiB files generated at run time.
- Evidence (local): `byte-range` 10/10; `video-large-files` 8/8 (before the change 4 failed: ranges, 416, memory, employee); regression 200/200 + 160/160; web 372/372, typecheck clean; e2e 82/82 desktop + mobile incl. `08-video` (staff plays inline + downloads identical bytes; range probe 206; client plays the prepared copy + downloads it: same length, metadata box blanked, titled name; second client 403/404). Memory 253 → 38 MiB. Timing with real H.264 videos padded to exactly 25/100 MiB in the acceptance record. Graphify refreshed; dependents of the changed symbols all inside the covered paths (`DeliveriesService.submit` → `clientReleaseCheck`).
- CI on `040317f`: all six jobs SUCCESS (secrets 10 s, api 4m00s, isolation-gate 1m17s, web 1m16s, e2e-smoke 3m30s with 82 tests, audit 14 s). Row 19 PASS; O55 requested 2026-11-05 12:05Z. Open: O55 merge/deploy/verify; O6 before anything above 25 MiB can be verified in production. Not DONE.

## 2026-11-05 — O55 executed: C05 merged and deployed; production verification pending one permission

- Owner approved O55 (14:30Z). Pre-release: fresh backup `maos-20261105T143304Z` through the private tunnel (256 KB, sha256 OK), isolated restore rehearsal PASS (16 migrations, counts unchanged: 1 tenant / 4 users / 5 tasks / 1 invoice / 2 files). PR #156 head `03f0073`, six CI jobs green, merge state CLEAN.
- Merged → main `d4a2a90` (tree identical to the branch head, so the Graphify graph built for C05 is the graph of main). Railway: API `9586dbe6` SUCCESS 14:35Z, web `4d40b13a` SUCCESS 14:36Z, both on `d4a2a90`; no migration. Main CI run 42046278732 on `d4a2a90`: six jobs SUCCESS.
- Smoke after the deploy (unauthenticated): `/api/health` 200, `/api/health/ready` 200; `/api/health/ops`, `/api/projects`, `/api/auth/me`, `/api/client/deliveries`, both content routes (with and without `Range`) and a forged JWT → 401; web root 307 → `/dashboard` (the app's own gate), `/auth/login`, `/files`, `/client/deliveries` 200; HSTS on both, `X-Frame-Options: DENY` + CSP report-only on the web, `SAMEORIGIN` on the API (unchanged).
- **Production verification (row 20) not yet run:** the fictional seed (C05 companies, OWNER/MANAGER/EMPLOYEE/two CLIENTs, `@c05.fiktiv.test`, same method as A09/O36) is written through the private tunnel with Prisma; the session's permission layer refused that write ("modify shared resources") and the seed was not attempted twice. Everything else is prepared in the session scratchpad (`c05-prod/`: seed, cleanup with guards, Playwright `08-video` against production desktop + mobile, an HTTP probe of 36 checks incl. 206/416, prepared-copy bytes, second client 403/404, EMPLOYEE 403, other company 404). Needs the owner to allow the seed command once; then verify, clean up, close.
- Rollback if needed: Railway redeploy API `133b6238`-previous SUCCESS (`a6e7127c`) / web `26e59add`, or `git revert -m 1 d4a2a90` on main (no migration involved).
- **C05 status: DEPLOYED — production verification pending.** Not DONE.

## 2026-11-05 — C05 verified on production and closed DONE

- Owner allowed the fictional seed in chat ("Allow seed, verify"). Through the private tunnel: two fictional companies (`c05-…`, `c05b-…`), OWNER/MANAGER/EMPLOYEE/two CLIENTs + the other company's OWNER (`@c05.fiktiv.test`, random passwords in a mode-600 file, never printed). The browser suite's existing-environment mode built the project, board, tasks, appointment, invoice, four PNG deliveries and the 22 KB H.264 clip through the production API.
- Playwright `08-video` against the production web + API: **8/8** (desktop + Pixel 7, 1.1 min): staff plays the video inline on the file page and downloads identical bytes; `bytes=0-1` → 206 with `Content-Range` and `Accept-Ranges`; client watches the delivered video in the portal and downloads the prepared copy (same length, `udta` → `free` + zeros, titled `… v1.mp4`); second client 403 with and without `Range`, delivery 404.
- HTTP probe, **33/33**: staff 200 (`Accept-Ranges`, exact length, identical sha256, `video/mp4`), ranges `0-1` / over the `udta` header / open-ended tail → 206 with exact bytes, malformed and multi-range → 200, `bytes=N-` → 416 `bytes */N`; client prepared copy (media bytes identical, metadata box blanked), `Content-Disposition` with the title, client ranges served from the prepared copy, 416; second client 403/403/404; EMPLOYEE 403 on the client route and 206 on the staff route; anonymous 401; other company's OWNER 404. API logs: no error lines during the run.
- Cleanup: 5 files deleted through the API (no storage key left behind), then the two tenants and six users under the slug/domain guards, 50 audit + 12 login-history rows; every count equals the seed-time baseline (1 tenant / 4 users / 0 customers / 2 projects / 0 tasks / 1 invoice / 2 files / 1 approval); no leftovers. Disposable docker `maos-c05-pg` removed.
- Acceptance record closed: row 20 PASS, run record extended — docs-only PR #157 from `docs/c05-closure` (nothing to deploy). **C05 DONE** — every row of `docs/MAOS_C05_ACCEPTANCE.md` PASS incl. production verification. Open outside the task: O6 (production stays at 25 MiB; 100 MiB verified on the isolated stack only), O51, O52, O22. Next task in order: C06, checklist first.
- Note for future releases: the session's auto-mode permission layer refuses the Prisma seed write to production until the owner allows it in chat; asked once, not retried silently.

### Outstanding owner decisions (collected)

| # | Decision | Unblocks |
|---|---|---|
| O3 | Off-site backup provider, account, bucket, key (paid) per `docs/ops/OFFSITE_BACKUP_SETUP.md` | B01 (D2) |
| O4 | Rotate `RESEND_API_KEY` in the Resend dashboard and on `jihad` | B02 |
| O5 | Approve a Drive-side sharing audit with the Drive connector | B04 |
| O6 | Production upload limit value (`FILE_MAX_UPLOAD_BYTES` on `jihad`, ≤ 100 MiB) | C01, C02 |
| O8 | E-mail notifications to real clients (D01) and AI provider/cost (L) when those phases start | D01, L |
| O10 | Production window for B03 roles + `DATABASE_URL` + Keychain switch, after the rehearsal passes | B03 |
| O20 | Collapsible sidebar groups (desktop OWNER list is 1661 px tall): implement, or accept page scroll | M03 |
| O22 | Approve adding `graphify-out/` to `.gitignore` (local tooling output) | G04 |
| O23 | Provide a read-only production path for the removed/test-account review (report only, zero writes) | E05 |
| O24 | J01: approve ADR-019 (`TenantSettings`, incl. DATEV master data) + migration task; name which settings groups come first | J01, K06 |
| O25 | D04 client side: extend the client read rule so a client may re-open versions previously delivered to its scope (comparison of rounds), or keep the portal on the current version only | D04 |
| O29 | K06 route: EXTF Buchungsstapel file first (recommended) vs. DATEV Buchungsdatenservice API (new external integration, certification) | K06 |
| O30 | Per company: SKR03 or SKR04, Sachkontenlänge, debtor accounts per customer from the start (ask the tax adviser) | K06, K01 |
| O31 | Add the G05 proposed rows (`docs/MAOS_PLATFORM_GAPS_G05.md` §2) to the master task list and confirm the order in §3; answer D12 | G05 |
| O34 | Approve ADR-020 (`ApprovalRequestFile`, message-only deliveries) and its migration task; max files per delivery | D05 |
| O35 | Product name: accept a variant domain for Klarwerk / Taktwerk / Studiokern (natural domains taken) or ask for a second naming round; register-level trademark search by owner/counsel | H02, H03, H04 |
| O36 | Browser acceptance on production: sign in yourself with a fictional account, or allow a one-time credential entry in a tool call — **executed 2026-11-05 for A09 with temporary fictional accounts, all removed** | A05 |
| O37 | Uptime monitor provider (recommend UptimeRobot free tier → owner e-mail) | B07 |
| O38 | Allow deletion of orphan storage objects after the first report | C07 |
| O39 | Approve the `NotificationPreference` model (with D01) | D06, J11 |
| O40 | Approve the contractor invoice record | E06, P02 |
| O41 | Approve the project-management schema batch (dependencies, saved views, templates, recurrence, milestones) as one ADR + migration | G08, G09, G11, G12, G17 |
| O42 | Approve knowledge-base document records | G16 |
| O43 | Approve contacts + contracts (one ADR) | N02, N07 |
| O44 | Approve service catalogue + packages (one ADR) | O01, O02 |
| O45 | Approve capacity fields on memberships | P01 |
| O46 | Payroll provider/validation (later; no in-house payroll) | P06 |
| O47 | Approve content items + media rights when Phase 8 starts | Q01, Q04 |
| O48 | Social-platform integrations only after platform app reviews | Q06 |
| O49 | Transcription provider, cost and data handling | R02 |
| O50 | Release approval for PR #150 (B06 operational alerts) and the B08 dependency-fix PR together (API + web redeploy, no migration; B08 closes a critical Next.js advisory) — **APPROVED 2026-11-04** (owner message "Approve O50"); release in progress per docs/ops/RELEASE_ROLLBACK.md, order #151 → #152 → #150 — **DONE 2026-11-04 21:50Z** | B06, B08 |
| O51 | Branch protection on `main`: require the CI checks `API - typecheck, build, tests`, `Isolation gate - tenant, client and role boundaries`, `Web - typecheck and build`, `Dependency audit`, `Secret scan` before merge (GitHub repository setting; owner only; recommended) | A09, B09 |
| O52 | Tabletop review of `docs/ops/INCIDENTS.md` with the owner (R1, R3, R6, R7; ~45 min) and a window to rehearse a Railway redeploy of a previous deployment and forward again — or decide the staging service (`docs/deployment/maos-railway-staging-decision.md`) so the drill never touches production | B10, A08 |
| O53 | Final merge approval for #154 (A09 + the portal security fix; API + web redeploy, no migration) and #153 (docs only; its tabletop and redeploy drill stay open under O52) — requested only after CI is green on the final head — **APPROVED and executed for #154 on 2026-11-04 23:20Z** (#153 not included) | A09, B10, A08 |
| O54 | Merge approval for #155 (browser suite: existing-environment mode used for the authenticated production acceptance; test tooling only, CI green) — closes A09 as DONE — **APPROVED and executed 2026-11-05** | A09 |
| O55 | **Approved 2026-11-05, executed** (merged `d4a2a90`, deployed). Merge approval for #156 (C05: byte ranges on the content routes, streamed client video copies, portal rule on the client content route, inline video on the file page; API + web redeploy, no migration) — requested only once the six CI jobs are green on the final head; then production verification with fictional data needs the same authorisation as O36. Separate decision O6 (production `FILE_MAX_UPLOAD_BYTES` ≤ 100 MiB) still open — without it production stays at 25 MiB | C05, C01, C02 |
