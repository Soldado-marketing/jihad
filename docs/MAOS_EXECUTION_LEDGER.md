# MAOS Execution Ledger

Operational execution state for MAOS, kept so that any Claude Code session can resume the exact task without replanning.

- **Not** a product specification: target architecture lives in `docs/MAOS_PRODUCT_BLUEPRINT.md` (Blueprint).
- **Not** the historical Master Doc (claude.ai MAOS Project): that remains history and owner decisions.
- Process rules: the owner-approved MAOS Master Autonomous Build & Completion Protocol v1.0 (2026-10-09).
- Repository code and git history are the source of truth for current implementation; this file records execution state only.
- Until this file is merged into `main`, the live copy is on branch `docs/execution-ledger`; every update is committed there.

---

## Current state

| Field | Value |
|---|---|
| CURRENT_MAIN | `0073b6b` (T35 #31 merged 2026-10-10) |
| CURRENT_WAVE | W1/W2 remainder unlocked by the merges: T19, T24, T28, T29, T35, T39, D16 overpayment; then W3 T40 (migration gate) |
| ACTIVE_TASK | MAOS-D16a Reject overpayments (code, no migration) |
| TASK_STATUS | COMPLETE_AWAITING_MERGE (PR open, landing) |
| CURRENT_BRANCH | fix/reject-overpayment |
| HEAD | — |
| COMPLETED_STEPS | — |
| CURRENT_STEP | — |
| REMAINING_STEPS | — |
| TESTS_PASSED | finance-payment-rules 15/15 (7 new); integration-api 35/35; 5 mutations caught incl. lock removal |
| TESTS_PENDING | — |
| PR_URL | open: D16a (this branch), #26 (migration-gated) |
| CI_STATUS | main `c828abe` green; gate 281/281, integration 159/159 |
| BLOCKERS | none for T19, T24, T28, T29, T35, T39, D16 overpayment (code) |
| OWNER_GATE_PENDING | (1) OWNER_GATE_MIGRATION for #26: review → fresh prod backup → sha256 → pg_restore --list → owner approval → apply → health, before merge/deploy; (2) T18 Keychain item stored by the owner; (3) T21/T22 owner actions; (4) D2, D3, D6 deferred |
| REAL_CLIENT_DATA_ALLOWED | NO (owner decision; changes only at gate G-DATA) |
| LAST_SAFE_CHECKPOINT | 2026-10-10 — all non-migration PRs merged and verified; no uncommitted work |
| EXACT_NEXT_ACTION | Land D16a; then MAOS-T39 (stale test triage) from current main; then F-1 → F-2 → F-3 → T40 + D16b idempotency (migration gate). |

## Session resume protocol (resume command: `كمل MAOS`)

1. `cd ~/Developer/MAOS/claude && git fetch origin`; check `git status`, branch and HEAD.
2. Read this ledger (from `main`, or `origin/docs/execution-ledger` until merged). Compare it with Git and, only if relevant to the active task, its PR/CI.
3. If ACTIVE_TASK is set: continue that task from EXACT_NEXT_ACTION. Never switch tasks because a session restarted.
4. Owner gates are non-blocking when safe work exists: record the gate, mark what it blocks, never cross it or assume approval, and continue with the next dependency-ready task that needs no approval. Stop and wait only when (a) the gate blocks all remaining dependency-ready work, (b) continuing would break task/wave order, (c) the next step needs a merge, deploy, migration, production write, secret, credential, paid service, DNS, destructive or other owner-only action, or (d) there is a real safety or Blueprint conflict.
5. If no task is active and no gate blocks: start the first dependency-ready task in Execution order.
6. If the last session ended without a clean checkpoint: rebuild state from git log, pushed branches, PRs and CI, update this table, then continue.
7. Read the Blueprint only when the active task needs architecture validation or a conflict appears. Do not re-audit, re-plan or rerun completed tests.
8. Update this table when a task starts, after tests, commit, push, PR, CI results, before an owner gate and before stopping.

## Owner gates and decisions

| ID | Decision / gate | Blocks | Status |
|---|---|---|---|

**Owner decisions 2026-10-10:** #13 APPROVED to merge (only #13). T35 YES (contractors: assigned items only). T36 YES (hide unenforced visibilityScope options). D4/T37 YES (default recipients: invoice's own client scope, ACTIVE users/memberships). T38/T39 YES with verification (no legitimate callers first). D9 YES (per-recipient delivery tracking; migration gate still applies). D16: reject overpayments; add duplicate-payment/idempotency protection (migration gate still applies). T18 YES (Keychain; never print the credential). D1 approved in principle: merge #4 only after green CI and no conflict. DEFERRED: D2, D3, D6. Other PR merges (#5–#12, #14–#19) remain owner-gated.

| D1 | Review and merge MAOS-T09 Blueprint (`docs/product-blueprint-v1`) | T11, T13 | OPEN |
| D2 | Off-Mac backup storage target (provider, region, cost) | T20 | OPEN |
| D3 | Keep or close the public PostgreSQL endpoint | T18 design, G-DATA | OPEN |
| D4 | Un-defer invoice default-recipient filtering | T37 | OPEN (deferred) |
| D5 | Repository visibility (currently public) | G-DATA | OPEN |
| D6 | German invoice regime (VAT / Kleinunternehmer, numbering, legal fields) | T41, T42 | OPEN |
| D7 | Dashboard information architecture | T121 | OPEN |
| D8 | Scheduler hosting (in-process vs worker; Railway impact) | T125 | OPEN |
| D9 | Email delivery tracking scope (EmailMessage/EmailEvent) | T44, T45 | OPEN |
| D10 | Staging / preview environment (cost, Railway) | T14 follow-up | OPEN |
| D11 | PR tooling (`gh`) | every task's PR step | RESOLVED 2026-10-09 (gh authenticated; PRs #4–#10 opened) |
| D16 | Payments: overpayment handling (reject vs credit) and repeat-submit idempotency (needs an idempotency key = schema); split out of T34 | finance | OPEN |
| D15 | Prisma major upgrade: remaining API advisories (deepmerge-ts via @prisma/config) need Prisma >6; config-load only | API advisories | OPEN (non-blocking) |
| D14 | Next 16 (major): remaining web advisories are in the postcss 8.4.31 pinned by Next 15 (build-time only for MAOS); fixing them needs a separate major-upgrade task | web advisories | OPEN (non-blocking) |
| D13 | Merge order: T16 and T17 both append to the blocking-gate list in `ci.yml`, and T23 appends to the integration step; later merges need trivial conflict resolution (keep all entries; gate 273, integration 111) | T16/T17/T23 merge | OPEN (mechanical) |
| F-2 | No real invite-acceptance flow exists (placeholder removed in T38); needs a token-verified invite task | invites | OPEN |
| F-1 | Approving a CLIENT never sets its clientScopeKey, so a UI-approved client gets a fail-closed 403 in the portal (found in T36; needs a task: client onboarding sets the scope / Customer link) | client portal onboarding | OPEN |
| F-3 | CRM PATCH bodies (meetings, follow-ups, opportunities) and POST /reports are declared as inline types, so no DTO validation runs; an invalid status gives 500 instead of 400. No ID is written on those paths, so no isolation impact (found in T29). Fix: use UpdateOpportunityDto, add update DTOs for meetings/follow-ups and a reports DTO | crm, reports | OPEN |
| CI-1 | Docker Hub pull rate limit blocked PR CI (2026-10-09). Fixed by T146 (#13 merged); PRs re-triggered and all pass. | — | RESOLVED |
| D12 | Floor order: the protocol's floor diagram puts Operations (My Work, Calendar, Templates, Recurring, Requests) before People & Money, but its wave list puts Calendar, Templates, Recurring and Requests in W6 after W5. This registry follows the wave list. | W5/W6 order | OPEN (non-blocking) |
| G-DATA | Real-client-data readiness | REAL_CLIENT_DATA_ALLOWED | OPEN |

Each schema task also needs OWNER_GATE_MIGRATION before production apply (see Database safety in the protocol).

## Test baseline (`df08135`, 2026-10-09)

| Check | Result |
|---|---|
| API full (`npm test`) | 342 tests / 299 pass / 43 fail (known) |
| API blocking gate (ci.yml list) | 239 / 239 on `main`; 258 / 258 on T16 branch |
| Integration (integration-api, then security pair) | 34/34 + 67/67 = 101 / 101 |
| Web full (`npm test`) | 64 tests / 61 pass / 3 fail (known) |
| Web contract | 5 / 5 |
| API typecheck (`tsconfig.build.json`) / build | PASS / PASS |
| Web typecheck / build | PASS / PASS |
| NEW_REGRESSIONS | 0 |

### Known pre-existing failures

Compared by test identity, never by count.

**API (43)** — stale source-text assertions from old sprint specs:

- sprint-1b-baseline: includes restricted placeholders for Manager, Employee, and Client scopes; keeps the MVP role foundation to Owner, Manager, Employee, and Client
- sprint-3-baseline: creates audit placeholders for project, task, and subtask changes; requires tenant context in Sprint 3 repositories; uses permission guard and project/task/subtask permission resources on protected routes
- sprint-4-baseline: adds audit placeholders for client portal access and views without returning audit data; uses permission guard and client-portal scoped read permissions
- sprint-5-baseline: adds CRM and collaboration modules with REST-first endpoint skeletons; adds audit placeholders for CRM and internal collaboration actions; keeps CRM and collaboration repositories tenant-aware without direct unscoped access; keeps CRM out of client portal routes and collaboration internal-only; uses permission guard and Sprint 5 permission resources on protected routes
- sprint-6-baseline: adds file, file version, and approval modules with REST-first endpoint skeletons; adds signed URL placeholder safeguards and audit placeholders; keeps file and approval repositories tenant-aware without direct unscoped access; preserves client-visible file boundary and approval-safe payloads; uses permission guard and Sprint 6 permission resources on protected routes
- sprint-7-baseline: adds REST-first chat and notification endpoint skeletons; adds audit placeholders for chat, notification, and realtime actions; keeps chat and notification repositories tenant-aware without direct unscoped access; preserves internal and client channel separation plus realtime authorization placeholders; uses permission guard and Sprint 7 permission resources on protected routes
- sprint-8-baseline: adds REST-first voice note and voice-to-task endpoint skeletons; adds Sprint 8 audit placeholders and preserves client boundary; keeps voice repositories tenant-aware and avoids direct unscoped access; requires human confirmation and does not automatically create tasks; uses permission guard and Sprint 8 permission resources on protected routes
- sprint-9-baseline: adds client-safe invoice and payment placeholders without cost or payroll exposure; adds finance audit placeholders and keeps provider integration deferred; adds the required Sprint 9 endpoint skeletons; keeps finance repositories tenant-aware without direct unscoped access; uses owner-only finance controls and permission resources on protected routes
- sprint-10-baseline: adds dashboard/report audit placeholders and keeps advanced BI deferred; keeps client dashboard summaries client-safe (**real defect: T26**); keeps dashboard and report repositories tenant-aware without direct unscoped access; suppresses hidden counts and protects owner-only finance summary data; uses permission guards and safe Manager dashboard/report placeholders
- sprint-11-mvp-hardening: confirms deferred external integrations and post-MVP modules remain absent; keeps protected MVP controllers guarded with permission requirements; keeps tenant-aware repository access for MVP business modules; preserves AI and voice safety placeholders without external provider calls or automatic task creation; preserves client portal, signed URL, chat/realtime, and report leakage controls; preserves owner-only finance and client-safe invoice/payment boundaries

**Web (3):** keeps Sprint 8 safety messaging and avoids deferred feature implementation; keeps non-Sprint-4 features absent from client portal pages; keeps owner-only finance widget separate from client dashboard summaries.

## Completed / merged / blocked

| Task | Title | Branch | PR | Tests | NEW_REG | Status |
|---|---|---|---|---|---|---|
| MAOS-T01 | Review invoice recipient privacy fix | fix/invoice-recipient-privacy | — | review | 0 | COMPLETE_MERGED |
| MAOS-T02 | Merge invoice recipient privacy fix | fix/invoice-recipient-privacy | — (`91c877c`) | CI | 0 | COMPLETE_MERGED |
| MAOS-T03 | Preserve old dev-database dumps in `~/MAOS_BACKUPS/legacy` | — (ops) | — | files present | n/a | COMPLETE |
| MAOS-T04 | No verifiable record | — | — | — | — | UNKNOWN |
| MAOS-T05 | Consolidate MAOS under `~/Developer/MAOS` (legacy/, master/) | — (ops) | — | 772-file manifest | n/a | COMPLETE |
| MAOS-T06 | Delete verified external originals (part 1) | — (ops) | — | per `legacy/README.md` | n/a | COMPLETE |
| MAOS-T07 | Complete legacy consolidation 2026-10-02 | — (ops) | — | per `legacy/README.md` | n/a | COMPLETE |
| MAOS-T08 | Backup/restore reliability + CI race fix | fix/backup-restore-reliability | #3 (`df08135`) | gate 239/239, integration 101/101 | 0 | COMPLETE_MERGED |
| MAOS-T09 | Product Blueprint v1 (+ 2026-10-09 refresh) | docs/product-blueprint-v1 (`5618d78`) | #4 MERGED (`0d73f6c`) | CI PASS | 0 | COMPLETE_MERGED |
| MAOS-T10 | Execution ledger and task registry | docs/execution-ledger | #5 (open) | docs checks | 0 | COMPLETE_AWAITING_MERGE |
| MAOS-T12 | Env and deploy documentation refresh | docs/env-deploy-refresh (`0d19d0d`) | #6 MERGED (`98a5f29`) | compose config, link and secret checks | 0 | COMPLETE_MERGED |
| MAOS-T14 | Release-control assessment (ADR-016) | docs/release-control-assessment (`8c3b608`) | #7 MERGED (`9b9ca39`) | evidence + table + secret checks | 0 | COMPLETE_MERGED |
| MAOS-T16 | Restore rehearsal script | ops/restore-rehearsal-script (`4a49bde`) | #8 MERGED (`8f65018`) | 19 new tests; gate 258/258; real Docker e2e on synthetic dump | 0 | COMPLETE_MERGED |
| MAOS-T17 | Version-control nightly backup runner + pg_dump shim | ops/backup-wrapper-in-repo (`9020aa1`) | #9 MERGED (`53a7a10`) | 15 new tests (macOS + Linux); gate 254/254; real e2e backup -> rehearsal | 0 | COMPLETE_MERGED |
| MAOS-T23 | Suspended/non-active users lose access immediately | fix/suspended-user-access (`e81952d`) | #10 MERGED (`c670582`) | new integration suite 10/10; 4 independent mutations caught; gate 239/239; integration 111/111 | 0 | COMPLETE_MERGED |
| MAOS-T25 | LoginHistory writers + own-history reader | fix/login-history-writers (`3ab7418`) | #11 MERGED (`20908f5`) | new integration suite 8/8; 4 mutations caught; write-failure safe; gate 239/239; integration 109/109 | 0 | COMPLETE_MERGED |
| MAOS-T26 | Client-summary isolation | fix/client-summary-isolation | #12 MERGED (`1ec415a`) | 5 new isolation tests; 4 mutations caught; gate 239/239; integration 106/106 | 0 | COMPLETE_MERGED |
| MAOS-T146 | CI PostgreSQL service from ECR Public mirror (pulled forward: blocks all PR CI) | ci/postgres-service-mirror | #13 MERGED (`9dd7047`) | CI PASS; follow-up #21 fixes phase-5-ops assertion it broke | 1 → fixed in #21 | COMPLETE_MERGED (follow-up #21 merged) |
| MAOS-T27 | Foreign-ID tenant validation — work domain | fix/foreign-id-work-domain | #14 MERGED (`3daf138`) | new suite 12/12; 4 mutations caught; gate 239/239; integration 113/113 | 0 | COMPLETE_MERGED |
| MAOS-T30 | Web dependency patch: Next.js 15.5.27 | fix/web-next-patch | #15 MERGED (`f725754`) | web typecheck/build/contract; full web 3 known; prod Docker image built and served 200 | 0 | COMPLETE_MERGED |
| MAOS-T31 | API dependency patch (proxy-addr, multer, platform-express) | fix/api-dependency-patch | #16 MERGED (`af16468`) | 0 critical; gate 239/239; integration 101/101; prod image health/ready 200 | 0 | COMPLETE_MERGED |
| MAOS-T32 | Trust proxy + per-client throttling | fix/trust-proxy-throttling | #17 MERGED (`3e14f6d`) | unit 8/8 (gate 247), throttle 2/2 (integration 103); 3 mutations; real boot | 0 | COMPLETE_MERGED |
| MAOS-T33 | Web security headers (CSP report-only) | fix/web-security-headers | #18 MERGED (`af7f284`) | header tests 7/7 (web contract 12); 3 mutations; served headers verified on prod build | 0 | COMPLETE_MERGED |
| MAOS-T34 | Finance payment rules (status, currency, client scope) | fix/finance-payment-rules | #19 MERGED (`1697b6d`) | suite 8/8; 5 mutations; integration 110/110; gate 239/239 | 0 | COMPLETE_MERGED |
| MAOS-T36 | visibilityScope: store/show only the enforced scope | fix/visibility-scope-restriction | #20 MERGED (`452ef3e`) | API 6/6 (integration 107), web 4/4 (contract 9), mutation caught | 0 | COMPLETE_MERGED |
| MAOS-T146b | phase-5-ops accepts mirrored image (fixes regression from #13) | fix/phase5-ops-mirrored-image | #21 MERGED (`33310e3`) | phase-5-ops 28/28; full suite back to 43 known | 0 | COMPLETE_MERGED |
| MAOS-T13 | Instruction-file accuracy | docs/instruction-file-accuracy | #22 MERGED (`437f15f`) | docs checks; suites unchanged | 0 | COMPLETE_MERGED |
| MAOS-T11 | Blueprint v1.1 (approved product structure) | docs/blueprint-v1-1 | #23 MERGED (`c0bbc72`) | 43 sections, tables valid | 0 | COMPLETE_MERGED |
| MAOS-T37 | Default invoice recipients: own active client (D4) | fix/invoice-default-recipients | #24 MERGED (`7fce1ac`) | suite 5/5; 4 mutations; integration 106/106 | 0 | COMPLETE_MERGED |
| MAOS-T38 | Remove fake-success placeholders + unused placeholder code (non-session) | fix/remove-placeholder-endpoints | #25 MERGED (`c828abe`) | callers traced; gate 239/239; integration 102/102; obsolete assertions updated | 0 | COMPLETE_MERGED |
| MAOS-T19 | Backup failure and staleness alerting | ops/backup-alerting | #27 MERGED (`75d30ac`) | 16 tests macOS + Linux; 4 mutations; gate 297/297 | 0 | COMPLETE_MERGED |
| MAOS-T24 | Real session endpoints (list, current, revoke own) | fix/real-session-endpoints | #28 MERGED (`a7c5246`) | suite 9/9; 5 mutations | 0 | COMPLETE_MERGED |
| MAOS-T28 | Foreign-ID tenant validation — files, approvals, chat, voice, collaboration | fix/foreign-id-content | #29 MERGED (`6277b26`) | suite 18/18; 8 mutations | 0 | COMPLETE_MERGED |
| MAOS-T29 | Foreign-ID tenant validation — CRM and finance | fix/foreign-id-crm-finance | #30 MERGED (`fa1b218`) | suite 8/8; 5 mutations | 0 | COMPLETE_MERGED |
| MAOS-T35 | Contractor assigned-item scope | fix/contractor-assigned-scope | #31 MERGED (`0073b6b`) | suite 20/20; 10 mutations | 0 | COMPLETE_MERGED |
| MAOS-D16a | Reject overpayments (row-locked balance check) | fix/reject-overpayment | (this PR) | finance 15/15; 5 mutations | 0 | COMPLETE_AWAITING_MERGE |
| MAOS-T44 | Email delivery tracking per recipient (D9) — migration | feat/email-delivery-tracking | #26 (open) | gate 243/243; integration 104/104; 3 mutations; migration applied only on disposable DBs | 0 | COMPLETE_AWAITING_MERGE (OWNER_GATE_MIGRATION) |

Unregistered branches: `feat/v2-a1-notifications` (A1 writers, conflicts with `main`; consumed by T47), `docs/consolidate` (superseded by T12; contains SH Investments content, must not be merged).

---

## Task registry

Columns: **M** migration · **P** production change · **R** Railway change · **X** external setup/secret · **G** owner gate (type) · **Risk**.
Specification depth: W0–W4 entries carry the full field set. W5–W10 entries are compact (title, wave, type, dependencies, migration, gate, risk, key constraint); before such a task becomes ACTIVE its full Goal / Problem / Scope / Expected files / Tests / Done / Not-include must be written into this ledger in the same branch as the first commit of that task.
Rules: one task = one branch from current verified `main` = one PR. Schema tasks are separate from code tasks. Production migration apply is always a separate OWNER_GATE_MIGRATION. Every code task: regression test first, gate + integration green, NEW_REGRESSIONS 0, typecheck + build, secret scan, PR with Before / After / How / Tests / Risks.

### W0 — Decisions + repository reconciliation

**T10 Execution ledger and task registry** · docs · deps — · M N · P N · R N · X N · G merge only · LOW
Goal: one resumable execution-state file with the full registry. Problem: no execution state survives sessions. Scope: `docs/MAOS_EXECUTION_LEDGER.md` only. Tests: Markdown sanity, secret scan, every task has all fields. Done: ledger committed and pushed. Not: Blueprint edits, code.

**T11 Blueprint v1.1 — approved product structure** · docs · deps T09 merged (D1) · M N · P N · R N · X N · G OWNER_GATE_PRODUCT_BEHAVIOR (review) · LOW
Goal: add the protocol's approved structure (My Work, Customer 360, Client Health, onboarding/offboarding, contracts/renewals, service catalog, retainers/packages, request center, templates, recurring work, dependencies, saved views, bulk actions, meeting notes→tasks, QC, approval queue, activity timeline, knowledge base, import/export, archive, system health, staging/release control, navigation groups) via §31 change control. Problem: these extend the Blueprint but are not recorded. Scope: `docs/MAOS_PRODUCT_BLUEPRINT.md`. Tests: OLD_RULE/PROPOSED_RULE/REASON/IMPACT per change; no invariant weakened. Done: v1.1 with changelog. Not: implementation, reordering phases beyond D12.

**T12 Env and deploy documentation refresh** · docs · deps — · M N · P N · R N · X N · G merge only · LOW
Goal: Resend-only env examples, `docs/DEPLOY.md`, `README.md`; remove SMTP references from `.env` examples, `docker-compose.yml`, `README.md`. Problem: SMTP is stale; `docs/consolidate` is stale and carries SH Investments content. Scope: those files, re-done from `main`. Tests: no SMTP references outside archives; no SH Investments file; secret scan. Done: PR open. Not: instruction files, code, deleting `docs/consolidate`.

**T13 Instruction-file accuracy** · docs · deps T09 merged (D1) · M N · P N · R N · X N · G merge only · LOW
Goal: `CLAUDE.md` (42 modules, no `prisma:migrate:dev` guidance, no nonexistent legacy root folders), `PROJECT_RULES.md` lines 5–12 paths, skill stale baselines and line 39. Problem: stale facts mislead agents. Scope: the three instruction files. Tests: every path and count matches the repo; no safety rule weakened. Done: PR open. Not: Blueprint.

**T14 Release-control assessment (staging, preview, feature flags)** · docs · deps — · M N · P N · R N · X N · G none (recommendation only; any Railway change is D10) · LOW
Goal: written assessment of current deployment and the smallest safe release-control option. Problem: unfinished high-risk work would be validated on production. Scope: `docs/` assessment section (in the deploy doc or an ADR under `docs/adr/`). Tests: facts verified read-only. Done: recommendation with cost/complexity. Not: creating services, flags code.

**T15 Branch hygiene** · ops · deps T12, T47 · M N · P N · R N · X N · G OWNER_GATE_DESTRUCTIVE_CLEANUP · LOW
Goal: delete merged local/remote branches and the superseded `docs/consolidate`, `feat/v2-a1-notifications` after their content is consumed. Problem: stale branches confuse state. Scope: git refs only. Tests: each deleted branch is merged or superseded (listed). Done: only active branches remain. Not: history rewrite.

### W1 — Operational recoverability

**T16 Restore rehearsal script** · ops · deps — · M N · P N · R N · X N · G none (real run is T22) · MEDIUM
Goal: `scripts/restore-rehearsal.sh`: verify checksum → disposable PostgreSQL container → `restore-db.sh` → row-count/table report → remove container; non-zero exit on any failure. Problem: rehearsals are manual. Scope: `scripts/`, `apps/api/test/` stub tests, blocking gate entry. Tests: stub docker/psql/pg_restore: success path, checksum failure, restore failure, cleanup always runs, no credentials in argv/output. Done: tests in blocking gate, PR open. Not: scheduling, real production dump run.

**T17 Version-control the nightly backup wrapper** · ops · deps — · M N · P N · R N · X N · G none (activation is T21) · MEDIUM
Goal: bring the `~/MAOS_BACKUPS/bin` wrapper into `scripts/` (sanitized, no secrets, no personal paths), with a run lock, duration guard and clear exit codes. Problem: the production backup job lives outside Git. Scope: `scripts/`, stub tests. Tests: stubbed success/failure/lock contention/timeout; retention logic. Done: tests in blocking gate. Not: credential source change, alerting, LaunchAgent edits.

**T18 Non-interactive database credential for backups** · ops · deps T17, D3 · M N · P N · R N · X Y (macOS Keychain item) · G OWNER_GATE_SECRET · MEDIUM
Goal: the wrapper reads the backup DSN from the Keychain instead of an interactive Railway CLI login. Problem: 2026-10-04 and 2026-10-06 failed on an expired login. Scope: wrapper credential function + docs. Tests: stubbed `security` CLI; missing item fails loudly; DSN never printed. Done: owner stores the item; one approved real run succeeds. Not: changing the database endpoint.

**T19 Backup failure and staleness alerting** · ops · deps T17 · M N · P N · R N · X N · G none · LOW
Goal: macOS notification on failure, plus a check that alerts when the newest verified dump is older than 26 h. Problem: failures are silent. Scope: `scripts/`, stub tests. Tests: stubbed failure and stale-dump cases raise the alert; healthy case stays silent. Done: tests in gate. Not: email/Slack delivery.

**T20 Off-Mac encrypted backup copy** · ops · deps T17, D2 · M N · P N · R N · X Y · G OWNER_GATE_SECRET / PAID_SERVICE · MEDIUM
Goal: encrypted copy of each verified dump to the D2 target with retention; checksum verified after upload. Problem: Mac-only backups. Scope: `scripts/`, docs. Tests: stubbed upload, encryption round-trip, checksum mismatch fails. Done: one approved real upload verified. Not: replacing the local copy.

**T21 Activate schedules** · ops · deps T16, T17, T19 (T18 recommended) · M N · P N · R N · X N · G OWNER_GATE (persistent configuration; `pmset` is applied by the owner) · MEDIUM
Goal: LaunchAgents run the repo wrapper nightly and the rehearsal weekly; a wake event precedes 03:30. Problem: old wrapper, no rehearsal schedule, sleep stretches runs. Scope: LaunchAgent plists under `~/MAOS_BACKUPS` + documented install steps. Tests: dry install, `launchctl list` shows both; next-night log success. Done: three consecutive nightly successes and one rehearsal. Not: cloud scheduling.

**T22 Prove restore** · ops · deps T16 · M N · P N (reads a local dump copy) · R N · X N · G OWNER_GATE (handling a production dump) · MEDIUM
Goal: run the rehearsal against the newest production dump in a disposable container; record row counts; document Mac wake/power limitations. Problem: last proven restore 2026-10-01. Scope: execution + report in ledger. Tests: rehearsal exit 0, counts recorded. Done: report committed. Not: restoring into any shared database.

### W2 — Security without migrations

**T23 Suspended/disabled users lose access immediately** · security · deps — · M N · P N · R N · X N · G none · MEDIUM
Goal: revoke sessions on suspend/disable; `validateSession` and `refresh` re-check `User.status` and membership status. Problem: suspended users keep working tokens. Scope: `auth`, `admin-users`, `sessions` modules. Tests: HTTP integration: suspend → existing access token and refresh both 401; re-activated user can log in again. Done: gate + integration green. Not: session endpoints (T24).

**T24 Real session endpoints** · security · deps T23 · M N · P N · R N · X N · G none · LOW
Goal: replace placeholder `GET /sessions/current` and `POST /sessions/revoke` with own-session list/revoke. Problem: endpoints fake success. Scope: `sessions` module (+ web settings use if present). Tests: cannot revoke another user's or tenant's session; revoked session gets 401. Done: no placeholder responses. Not: device management UI.

**T25 LoginHistory writers** · security · deps — · M N · P N · R N · X N · G none · LOW
Goal: write success and blocked/failed login entries (no passwords, no full user agent secrets). Problem: model never written. Scope: `auth`, `login-history`. Tests: integration asserts rows for success and failure; tenant scoping on read. Done: login-history page shows real rows. Not: new fields.

**T26 Client-summary isolation** · security · deps — · M N · P N · R N · X N · G none · LOW
Goal: `GET /dashboards/client-summary` counts only the caller's `clientScopeKey` (via `ClientScopeService`). Problem: CLIENT receives tenant-wide counts. Scope: `dashboards` module. Tests: extend `security-gate-client-isolation` (two clients, distinct counts); the stale sprint-10 assertion re-evaluated. Done: leak closed. Not: dashboard redesign.

**T27 Foreign-ID tenant validation — work domain** · security · deps — · M N · P N · R N · X N · G none · MEDIUM
Goal: validate body IDs (projectId, assignedToUserId, parent task, label IDs, project members) belong to the caller's tenant. Problem: unchecked writes allow cross-tenant links. Scope: `tasks`, `subtasks`, `projects`, `labels`; one shared helper in `common/`. Tests: cross-tenant HTTP tests per field (4xx, nothing written). Done: gate + integration green. Not: other domains.

**T28 Foreign-ID tenant validation — files, approvals, chat, voice, collaboration** · security · deps T27 · M N · P N · R N · X N · G none · MEDIUM
Goal/Problem/Tests as T27 for those modules. Done: all body foreign IDs validated. Not: CRM/finance.

**T29 Foreign-ID tenant validation — CRM and finance** · security · deps T27 · M N · P N · R N · X N · G none · MEDIUM
Goal/Problem/Tests as T27 for leads, opportunities, meetings, follow-ups, invoices, payments, revenue, costs. Not: finance rule changes (T34).

**T30 Web dependency patch** · security · deps — · M N · P N · R N · X N · G none · MEDIUM
Goal: Next.js 15.5.15 → 15.5.27 and fixable transitive advisories (postcss, nanoid, sharp, source-map-js). Problem: 1 critical + 4 high. Scope: `apps/web/package*.json`. Tests: web typecheck, build, contract, full suite (no new failures); `npm audit --omit=dev` no critical/high fixable. Done: PR open. Not: Next 16, API deps.

**T31 API dependency patch** · security · deps — · M N · P N · R N · X N · G none · MEDIUM
Goal: patch `@nestjs/platform-express` (multer ≥2.4.0), `prisma`/`@prisma/client` patch, `proxy-addr`, `deepmerge-ts`. Problem: 1 critical + 5 high. Scope: `apps/api/package*.json`. Tests: full API suite, gate, integration; `prisma generate` unchanged schema. Done: audit clean of fixable critical/high. Not: major upgrades, `npm audit fix --force`.

**T32 Trust proxy and throttling** · security · deps — · M N · P N · R N · X N · G none · LOW
Goal: `trust proxy` for exactly one hop; throttler keys on the client IP. Problem: all users share the proxy IP limit. Scope: `main.ts`/app bootstrap. Tests: forwarded-for header changes the throttle key; spoofed chains beyond one hop ignored. Done: test green. Not: rate-limit tuning.

**T33 Web security headers** · security · deps — · M N · P N · R N · X N · G none · MEDIUM
Goal: CSP (report-only first), `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options`, Referrer-Policy, Permissions-Policy. Problem: none set. Scope: `apps/web/next.config.*`. Tests: header test against the built server; app still renders. Done: headers present. Not: enforcing CSP before report-only review.

**T34 Finance rules without migration** · security · deps — · M N · P N · R N · X N · G none · MEDIUM
Goal: verify and enforce currency must match invoice currency, no payment on VOID/DRAFT invoices, overpayment rule, idempotent repeated payment submit (app level). Problem: unverified finance edge cases. Scope: `payments`, `invoices`. Tests: unit + integration per rule. Done: rules enforced and documented. Not: schema constraints (T40).

**T35 Contractor assigned-item scope** · security · deps T27 · M N · P N · R N · X N · G OWNER_GATE_PRODUCT_BEHAVIOR · HIGH
Goal: CONTRACTOR reads only projects/tasks/files they are assigned to (ProjectMember or task assignee), implemented in `ResourceScopeService`. Problem: contractors are limited by resource type only. Scope: permissions, projects, tasks, files. Tests: integration matrix (assigned vs unassigned, list + detail). Done: matrix green. Not: manager/employee scoping.

**T36 visibilityScope restriction** · security · deps — · M N · P N · R N · X N · G OWNER_GATE_PRODUCT_BEHAVIOR (proposal) · LOW
Goal: expose only enforced values in DTOs/UI; written proposal for the rest. Problem: unenforced values mislead. Scope: memberships DTOs, settings page. Tests: unsupported values rejected. Done: no misleading option visible. Not: enum change.

**T37 Invoice default-recipient filtering** · security · deps D4 · M N · P N · R N · X N · G D4 · LOW
Goal: default recipients = ACTIVE CLIENT members whose `clientScopeKey` matches the invoice. Problem: project-wide CLIENT members receive it. Scope: `invoices`. Tests: other-client member excluded; suspended excluded. Done: integration green. Not: email model.

**T38 Placeholder endpoints and dead code** · security · deps T24 · M N · P N · R N · X N · G OWNER_GATE_PRODUCT_BEHAVIOR (removals) · LOW
Goal: inventory and remove or explicitly guard AI, transcription and realtime placeholders and the `neural-hub-preview` page. Problem: fake-success surfaces. Scope: listed modules/pages. Tests: removed routes 404; nothing else changes. Done: no fake-success endpoint left. Not: building those features.

**T39 Stale test triage** · docs/test · deps T26 · M N · P N · R N · X N · G OWNER_GATE (any retirement) · LOW
Goal: rewrite each of the 43 API + 3 web stale assertions to current truth or retire it with approval; make the full suite blocking. Problem: red informational suite hides real signal. Scope: `apps/*/test/sprint-*`, CI. Tests: full suites green; no assertion weakened. Done: full suite blocking in CI. Not: product changes.

**T146 CI database service from a non-rate-limited registry** · ops · deps — · M N · P N · R N · X N · G none · LOW
Goal: the CI `postgres` service image is pulled from a registry without anonymous pull limits (for example the AWS ECR Public mirror of the official image), same version. Problem: concurrent PR runs hit Docker Hub's unauthenticated rate limit (CI-1) and fail before any test. Scope: `.github/workflows/ci.yml` service image only. Tests: CI green on the PR; image digest/version equivalent. Done: PR CI passes. Not: other CI changes.

### W3 — Safety requiring migrations

**T40 Revenue posting uniqueness** · schema · deps T34 · M Y · P via gate · R N · X N · G OWNER_GATE_MIGRATION · MEDIUM
Goal: partial unique index on `RevenueRecord(tenantId, invoiceId)` for invoice-sourced revenue; repository handles the unique violation idempotently. Problem: check-then-insert race. Scope: new migration + `invoices.repository.ts`. Tests: concurrent settle posts one row. Done: migration reviewed; applied only at gate. Not: other finance fields.

**T41 Invoice numbering policy** · schema · deps D6 · M Y · P via gate · R N · X N · G OWNER_GATE_MIGRATION · MEDIUM
Goal: gap-free sequential numbering per tenant (and year if D6 requires). Problem: numbering policy unverified against German rules. Scope: invoices + migration. Tests: concurrent creation yields unique sequential numbers. Not: PDF.

**T42 German invoice schema fields** · schema · deps D6 · M Y · P via gate · R N · X N · G OWNER_GATE_MIGRATION · MEDIUM
Goal: fields required by D6 (VAT rate/amount cents per line, seller/buyer tax identity, service date or period, Kleinunternehmer note flag). Problem: fields missing. Scope: Prisma schema + migration only. Tests: migration SQL review; prisma generate; existing tests green. Not: service/PDF.

**T43 German invoice service and PDF** · backend · deps T42 · M N · P N · R N · X N · G none · MEDIUM
Goal: compute and render the new fields; validation per D6. Tests: PDF content tests; totals in integer cents. Not: schema.

**T44 Email delivery model** · schema · deps D9 · M Y · P via gate · R N · X N · G OWNER_GATE_MIGRATION · LOW
Goal: `EmailMessage`/`EmailEvent` per recipient (Resend id, status). Scope: schema + writer in `mail`. Tests: per-recipient rows on send. Not: webhook.

**T45 Resend delivery webhook** · integration · deps T44 · M N · P N · R N · X Y (webhook secret) · G OWNER_GATE_SECRET · MEDIUM
Goal: verified-signature webhook updates EmailEvent. Tests: bad signature rejected; idempotent replay. Not: UI.

**T46 G-DATA readiness assessment** · docs · deps W1, W2, T40 · M N · P N · R N · X N · G OWNER_GATE_REAL_CLIENT_DATA · LOW
Goal: evidence checklist for real client data (backups, restore proof, security tasks, D3, D5). Done: owner decision recorded. Not: flipping the flag without approval.

### W4 — Core business (Phase A)

**T47 Notification writers** · backend · deps W2 security tasks touching invoices/payments merged · M N · G none · MEDIUM
Goal: land `NotificationsService.notify()` and the six events from `feat/v2-a1-notifications`, re-applied on current `main` (new branch; no rebase of the old one). Problem: branch conflicts in four invoice/payment files. Tests: the branch's integration tests + tenant/audience checks. Done: bell shows real notifications. Not: preferences, email.

**T48 Notification bell in the shell** · frontend · deps T47 · M N · G none · LOW
Goal: unread count + dropdown in topbar using existing endpoints. Tests: web contract test. Not: preferences.

**T49 Customer architecture decision record** · docs · deps T09 merged · M N · G OWNER_GATE_PRODUCT_BEHAVIOR · MEDIUM
Goal: Customer model, `clientScopeKey` mapping, backfill, compatibility period, isolation-test plan (Blueprint §10). Done: approved ADR. Not: schema.

**T50 Customer schema** · schema · deps T49 · M Y · G OWNER_GATE_MIGRATION · HIGH
Goal: `Customer` (tenant-scoped, unique per tenant `clientScopeKey`) and nullable `customerId` on Project, Invoice, FileAsset where the ADR says. Tests: migration review; existing suites green. Not: backfill, API.

**T51 Customer backfill** · ops · deps T50 · M N · P via gate · G OWNER_GATE_MIGRATION / REAL data · HIGH
Goal: idempotent dry-run-first script mapping each tenant's distinct `clientScopeKey` to one Customer and linking records. Tests: dry run report; rerun is a no-op; isolation suite green. Not: removing `clientScopeKey`.

**T52 Customer API** · backend · deps T50 · M N · G none · MEDIUM
Goal: CRUD + list/filter; new `CUSTOMER` PermissionResource added deliberately to every role policy. Tests: role matrix, tenant isolation, client sees only own. Not: Customer 360.

**T53 Customer list UI** · frontend · deps T52, T59, T60 · G none · LOW
Goal: list, filters (industry, service, status), create/edit. Tests: web tests; loading/empty/error states.

**T54 Customer 360 aggregation API** · backend · deps T52, T57 · G none · MEDIUM
Goal: one read endpoint aggregating projects, tasks, files, approvals, invoices, payments, meetings for a customer, permission-filtered. Tests: no sensitive finance for non-OWNER; tenant/client isolation.

**T55 Customer 360 UI** · frontend · deps T54, T61, T66 · G none · LOW
Goal: Overview, Projects, Files, Notes tabs + timeline. Tests: web tests.

**T56 Project enrichment schema** · schema · deps T50 · M Y · G OWNER_GATE_MIGRATION · MEDIUM
Goal: `customerId`, `serviceType`, `budgetCents`, `deadline`, `ownerUserId`, `projectNumber` (unique per tenant). Not: API/UI.

**T57 Project enrichment API** · backend · deps T56 · G none · MEDIUM
Goal: read/write new fields; derived progress from tasks. Tests: validation, tenant checks on `ownerUserId`/`customerId`.

**T58 Project enrichment UI** · frontend · deps T57, T59 · G none · LOW
Goal: table columns and detail fields per Blueprint §11.

**T59 Primitive: DataTable + pagination** · frontend · deps — · G none · LOW
Goal: one sortable, paginated table component; pilot on one existing list. Tests: component tests. Not: restyling other pages.

**T60 Primitive: FilterBar + search input** · frontend · deps T59 · G none · LOW
Goal: filter state in the URL (saved-view ready). Tests: component tests.

**T61 Primitives: DetailPanel, KPI card, unified StatusBadge, ErrorState** · frontend · deps — · G none · LOW
Goal: reuse existing badges/states; one drawer pattern. Tests: component tests.

**T62 CRM pipeline Kanban** · frontend · deps T59 · G none · LOW
Goal: 7-stage Kanban from existing CRM data (count + value per stage) reusing `kanban-board.tsx`. Tests: web tests. Not: schema.

**T63 Global search API** · backend · deps T52 · G none · MEDIUM
Goal: permission-aware search over customers, projects, tasks, files. Tests: never returns unauthorized or cross-tenant rows.

**T64 Global search UI and command palette** · frontend · deps T63 · G none · LOW
Goal: shell search + keyboard palette with quick actions. Tests: web tests.

**T65 Activity timeline API** · backend · deps — · G none · MEDIUM
Goal: read API over `AuditEvent` per resource, permission-filtered, client-safe. Tests: no internal events to CLIENT.

**T66 Activity timeline component** · frontend · deps T65 · G none · LOW

**T67 My Work aggregation API** · backend · deps T47 · G none · MEDIUM
Goal: one per-user view over assigned/overdue/upcoming tasks, approvals waiting, notifications, meetings, blocked work. Tests: only the caller's permitted items. Not: new records.

**T68 My Work UI** · frontend · deps T67, T59 · G none · LOW

**T69 Navigation regrouping** · frontend · deps T68 · G OWNER_GATE_PRODUCT_BEHAVIOR · LOW
Goal: smallest evolution of `navigation.ts` into WORK / PRODUCTION / BUSINESS / INSIGHTS / SYSTEM, role-aware. Not: new pages.

### W5 — People, time and money (Phase B)

**T70 Time and rate decision record** · docs · deps T09 merged · G OWNER_GATE_PRODUCT_BEHAVIOR · MEDIUM — rate resolution order, frozen rates, billable rules, sensitivity.
**T71 TimeEntry + Rate schema** · schema · deps T70, T56 · M Y · G OWNER_GATE_MIGRATION · MEDIUM
**T72 TimeEntry API** · backend · deps T71 · G none · MEDIUM — new `TIME_ENTRY` resource in every role policy; tenant/foreign-ID checks; tests per role.
**T73 Rate resolution and freezing** · backend · deps T71 · G none · MEDIUM — deterministic resolution; rate frozen on entry; `RATE` sensitive; tests: historical entries unchanged after rate edits.
**T74 Labour cost in project profitability** · backend · deps T72, T73 · G none · MEDIUM — integer cents; tests on `profitability.ts`.
**T75 Customer profitability** · backend · deps T74, T52 · G none · MEDIUM
**T76 Time & Costs UI** · frontend · deps T72, T59 · G none · LOW — timesheet, filters, project preview; rates hidden for non-permitted roles.
**T77 MemberProfile + ContractorTerms schema** · schema · deps T70 · M Y · G OWNER_GATE_MIGRATION · MEDIUM
**T78 Team enrichment API + UI** · fullstack · deps T77 · G none · MEDIUM — field-level rate protection tests.
**T79 Freelancer workspace** · fullstack · deps T35, T77 · G none · MEDIUM — assigned work, deliveries, approvals; no second identity system.
**T80 Freelancer invoice schema** · schema · deps T77 · M Y · G OWNER_GATE_MIGRATION · MEDIUM — invoice document via `FileAsset`, amount cents, status, matched items.
**T81 Freelancer invoice matching API** · backend · deps T80, T72 · G none · MEDIUM — match against approved work/time; amount due.
**T82 Freelancer Payment Center UI** · frontend · deps T81 · G none · LOW — open / partially paid / paid.
**T83 Capacity data schema** · schema · deps T77 · M Y · G OWNER_GATE_MIGRATION · LOW — weekly capacity/availability on MemberProfile.
**T84 Utilisation and resource planning view** · fullstack · deps T83, T72 · G none · MEDIUM — only from real TimeEntry/capacity data.
**T85 Agency capacity forecast** · backend · deps T84 · G none · MEDIUM
**T86 Profitability cockpit** · fullstack · deps T74, T75, T120 · G none · MEDIUM — estimated vs actual hours, labour/freelancer/external cost, margin by project/customer/service.

### W6 — Service delivery (Phase C)

**T87 TenantSettings schema** · schema · deps T09 merged · M Y · G OWNER_GATE_MIGRATION · LOW
**T88 Settings API + UI** · fullstack · deps T87 · G none · LOW — organization, branding, locale/timezone, working hours, cost defaults.
**T89 ServiceTemplate schema** · schema · deps T87 · M Y · G OWNER_GATE_MIGRATION · LOW
**T90 Service catalog API + UI** · fullstack · deps T89 · G none · LOW
**T91 Retainer / package schema** · schema · deps T89, T50 · M Y · G OWNER_GATE_MIGRATION · MEDIUM — recurring deliverable expectations per customer and month; no delivery engine.
**T92 Package API + UI** · fullstack · deps T91 · G none · MEDIUM
**T93 Template schema (project/task/content)** · schema · deps T89 · M Y · G OWNER_GATE_MIGRATION · MEDIUM
**T94 Template instantiate API** · backend · deps T93 · G none · MEDIUM — creates canonical Projects/Tasks.
**T95 Templates UI** · frontend · deps T94 · G none · LOW
**T96 Recurring work definitions** · fullstack · deps T93 · M Y (definition model) · G OWNER_GATE_MIGRATION · MEDIUM — explicit, owner-triggered generation into canonical Tasks; automatic generation is T141.
**T97 ContentItem schema** · schema · deps T50, T56 · M Y · G OWNER_GATE_MIGRATION · MEDIUM
**T98 Content API** · backend · deps T97 · G none · MEDIUM — reuses Task, FileAsset, ApprovalRequest; `CONTENT` resource in every role policy.
**T99 Content UI** · frontend · deps T98, T59 · G none · LOW — Kanban, list.
**T100 Monthly deliverables tracker** · fullstack · deps T92, T98 · G none · MEDIUM — counts from canonical content/tasks.
**T101 Media metadata schema** · schema · deps — · M Y · G OWNER_GATE_MIGRATION · LOW — `widthPx`, `heightPx`, `durationSeconds`, `thumbnailKey`.
**T102 Media UI upgrades** · fullstack · deps T101 · G none · MEDIUM — grid/list, filters, quota.
**T103 Calendar aggregation API** · backend · deps — · G none · MEDIUM — tasks due dates, meetings, later content/project deadlines; no storage.
**T104 Calendar UI** · frontend · deps T103 · G none · LOW — month/week/list; replaces the placeholder.
**T105 Client request schema** · schema · deps T50 · M Y · G OWNER_GATE_MIGRATION · MEDIUM
**T106 Client request portal + triage** · fullstack · deps T105 · G none · MEDIUM — portal submit → triage → canonical Task/Project; client sees status only.
**T107 Quality control checklists** · fullstack · deps T93 · G none · MEDIUM — reuse Subtask/Approval where possible.
**T108 Approval queue view** · fullstack · deps — · G none · LOW
**T109 Meeting notes → decisions → tasks** · fullstack · deps — · G none · MEDIUM — reuses Meeting, InternalNote, Task.
**T110 Task dependency schema** · schema · deps — · M Y · G OWNER_GATE_MIGRATION · LOW
**T111 Task dependencies API + UI** · fullstack · deps T110 · G none · MEDIUM — cycle prevention tests.
**T112 Saved views and bulk actions** · fullstack · deps T60 · M Y if views are stored · G OWNER_GATE_MIGRATION if stored · MEDIUM
**T113 Client onboarding / offboarding** · fullstack · deps T94 · G none · LOW — via templates.
**T114 Contracts / renewals schema** · schema · deps T50 · M Y · G OWNER_GATE_MIGRATION · MEDIUM
**T115 Contracts / renewals API + UI** · fullstack · deps T114 · G none · MEDIUM
**T116 Knowledge base schema** · schema · deps — · M Y · G OWNER_GATE_MIGRATION · LOW — SOPs, brand guidelines (per customer); not a Notion clone.
**T117 Knowledge base API + UI** · fullstack · deps T116 · G none · LOW
**T118 Import / export (CSV)** · fullstack · deps T52, T57 · G none · MEDIUM — customers, projects, tasks; validation report; no ETL platform.
**T119 Data archive / retention** · backend · deps T118 · G OWNER_GATE_PRODUCT_BEHAVIOR · MEDIUM

### W7 — Intelligence (Phase D)

**T120 MetricsService** · backend · deps T74 · G none · MEDIUM — periods, previous-period comparison, deltas, series; one canonical implementation.
**T121 Dashboard operational KPIs** · fullstack · deps T120, D7 · G D7 · MEDIUM
**T122 Dashboard period comparisons** · fullstack · deps T121 · G none · LOW
**T123 Report engine + PDF** · backend · deps T120 · G none · MEDIUM — replaces the row-only "run".
**T124 Excel export** · backend · deps T123 · G none · LOW
**T125 Scheduler infrastructure** · backend/ops · deps D8 · R maybe · G OWNER_GATE_RAILWAY if a service is added · HIGH — durable jobs, failure records.
**T126 Saved + scheduled reports** · fullstack · deps T123, T125 · G none · MEDIUM
**T127 Client health (explainable)** · fullstack · deps T120, T106 · G none · MEDIUM — score shows its inputs.
**T128 Delivery performance metrics** · backend · deps T120 · G none · LOW
**T129 Financial performance metrics** · backend · deps T120 · G none · LOW
**T130 Agency capacity reporting** · fullstack · deps T85, T120 · G none · LOW
**T131 System health page** · fullstack · deps T21, T125 · G none · MEDIUM — API/web health, deploy, backup freshness, rehearsal status, failed jobs; OWNER-only; no secrets.
**T132 Audit UI** · frontend · deps T65 · G none · LOW — OWNER-only.

### W8 — Social (Phase E)

**T133 SocialPost schema** · schema · deps T97 · M Y · G OWNER_GATE_MIGRATION · LOW
**T134 Social planning API** · backend · deps T133 · G none · MEDIUM — manual publish state; no real publishing.
**T135 Social page + calendar link** · frontend · deps T134, T104 · G none · LOW
**T136 Manual metric snapshots** · fullstack · deps T134 · G none · LOW — labelled manual, never shown as live.

### W9 — Integrations (Phase F)

**T137 Credential vault design** · docs · deps T125 · G OWNER_GATE_EXTERNAL_INTEGRATION · MEDIUM
**T138 Credential vault implementation** · schema/backend · deps T137 · M Y · X Y · G OWNER_GATE_SECRET / MIGRATION · HIGH — encrypted at rest; never returned to the browser.
**T139 Google Calendar sync** · integration · deps T138, T104 · X Y · G OWNER_GATE_EXTERNAL_INTEGRATION · MEDIUM
**T140 Slack notifications** · integration · deps T138, T47 · X Y · G OWNER_GATE_EXTERNAL_INTEGRATION · LOW
Meta, Instagram/Facebook, TikTok, Google Ads, GA4: DO_NOT_BUILD_YET until separately justified and approved.

### W10 — Automation (Phase G)

**T141 Recurring work generation job** · automation · deps T96, T125 · G none · MEDIUM — explicit, audited, idempotent per period.
**T142 Deadline and approval reminders** · automation · deps T125, T47 · G none · LOW
**T143 Renewal reminders** · automation · deps T115, T125 · G none · LOW
**T144 Reporting digests** · automation · deps T126 · G none · LOW
**T145 Failed-job alerts** · automation · deps T125, T131 · G none · LOW
Visual workflow builder and generic rule-engine UI: DO_NOT_BUILD_YET.

---

## Execution order

Dependency-ready tasks are taken top to bottom; gated tasks wait for their gate while the next ungated task proceeds. One ACTIVE task at a time.

1. **W0:** T10 → T12 → T14 → (T11, T13 after D1) → T15 (after T12, T47)
2. **W1:** T16 → T17 → T19 → (T18 after D3 + secret) → (T20 after D2) → (T21, T22 gates)
3. **W2:** T23 → T24 → T25 → T26 → T27 → T28 → T29 → T30 → T31 → T32 → T33 → T34 → T146 → (T35, T36, T37, T38, T39 at their gates)
4. **W3:** T40 → (T41, T42 after D6) → T43 → (T44, T45 after D9) → T46 (G-DATA)
5. **W4:** T47 → T48 → T59 → T60 → T61 → T62 → T65 → T66 → T67 → T68 → T49 → T50 → T51 → T52 → T53 → T54 → T55 → T56 → T57 → T58 → T63 → T64 → T69
6. **W5:** T70 → T86
7. **W6:** T87 → T119
8. **W7:** T120 → T132
9. **W8:** T133 → T136
10. **W9:** T137 → T140
11. **W10:** T141 → T145

## Ledger log

One line per completed task: `MAOS-Txx | title | branch | PR | tests | NEW_REGRESSIONS | status`

- MAOS-T09 | Product Blueprint v1 (+ refresh) | docs/product-blueprint-v1 | #4 (open) | docs checks | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T10 | Execution ledger and task registry | docs/execution-ledger | #5 (open) | docs checks, 136 tasks | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T12 | Env and deploy documentation refresh | docs/env-deploy-refresh | #6 (open) | compose config, links, secret scan | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T14 | Release-control assessment (ADR-016, Proposed) | docs/release-control-assessment | #7 (open) | docs checks | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T16 | Restore rehearsal script | ops/restore-rehearsal-script | #8 (open) | 19 tests, gate 258/258, full 43 known failures unchanged, real e2e | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T17 | Version-control nightly backup runner + pg_dump shim | ops/backup-wrapper-in-repo | #9 (open) | 15 tests (macOS + Linux), gate 254/254, full 43 known unchanged, real e2e | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T23 | Suspended/non-active users lose access immediately | fix/suspended-user-access | #10 (open) | revocation suite 10/10, mutations 4/4 caught, gate 239/239, integration 111/111 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T25 | LoginHistory writers + own-history reader | fix/login-history-writers | #11 (open) | suite 8/8, mutations 4/4, gate 239/239, integration 109/109 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T26 | Client-summary isolation | fix/client-summary-isolation | #12 (open) | 5 tests, mutations 4/4, gate 239/239, integration 106/106 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T146 | CI PostgreSQL service from ECR Public mirror | ci/postgres-service-mirror | #13 (open) | identical digest; own CI | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T27 | Foreign-ID tenant validation — work domain | fix/foreign-id-work-domain | #14 (open) | suite 12/12, mutations 4/4, gate 239/239, integration 113/113 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T30 | Web dependency patch: Next.js 15.5.27 | fix/web-next-patch | #15 (open) | typecheck, build, contract 5/5, full web 3 known, Docker image 200 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T31 | API dependency patch | fix/api-dependency-patch | #16 (open) | gate 239/239, integration 101/101, prod image 200/200 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T32 | Trust proxy + per-client throttling | fix/trust-proxy-throttling | #17 (open) | gate 247/247, integration 103/103, real boot | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T33 | Web security headers | fix/web-security-headers | #18 (open) | web contract 12/12, full web 3 known, served headers verified | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T34 | Finance payment rules | fix/finance-payment-rules | #19 (open) | suite 8/8, mutations 5/5, integration 110/110, gate 239/239 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T09 | Product Blueprint v1 | docs/product-blueprint-v1 | #4 MERGED | CI PASS | 0 | COMPLETE_MERGED
- MAOS-T146 | CI postgres mirror | ci/postgres-service-mirror | #13 MERGED | CI PASS | follow-up #21 | COMPLETE_MERGED
- MAOS-T36 | visibilityScope restriction | fix/visibility-scope-restriction | #20 (open) | API 6/6, web 4/4 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T146b | phase-5-ops mirrored image | fix/phase5-ops-mirrored-image | #21 (open) | 28/28 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T13 | Instruction-file accuracy | docs/instruction-file-accuracy | #22 (open) | docs | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T11 | Blueprint v1.1 | docs/blueprint-v1-1 | #23 (open) | docs | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T37 | Default invoice recipients | fix/invoice-default-recipients | #24 (open) | 5/5, integration 106/106 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T38 | Remove placeholders (non-session) | fix/remove-placeholder-endpoints | #25 (open) | gate 239/239, integration 102/102 | 0 | COMPLETE_AWAITING_MERGE
- 2026-10-10 merge batch | #21 #22 #23 #7 #6 #16 #15 #8 #9 #10 #11 #12 #14 #17 #18 #19 #20 #24 #25 merged → main `c828abe` | ci.yml conflicts union-resolved and re-measured per PR; DEPLOY.md conflict (#17) kept both rows; duplicate `run:` key (#20) fixed | gate 281/281, integration 159/159 | 0 | COMPLETE_MERGED
- MAOS-T44 | Email delivery tracking (migration) | feat/email-delivery-tracking | #26 (open) | gate 243/243, integration 104/104 | 0 | COMPLETE_AWAITING_MERGE + OWNER_GATE_MIGRATION
- MAOS-T19 | Backup failure and staleness alerting | ops/backup-alerting | PR | 16/16, gate 297/297, integration 159/159, full 43 known | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T24 | Real session endpoints | fix/real-session-endpoints | PR | 9/9, 5 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T28 | Foreign-ID validation — content domains | fix/foreign-id-content | PR | 18/18, 8 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T29 | Foreign-ID validation — CRM and finance | fix/foreign-id-crm-finance | PR | 8/8, 5 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T35 | Contractor assigned-item scope | fix/contractor-assigned-scope | PR | 20/20, 10 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-D16a | Reject overpayments | fix/reject-overpayment | PR | finance 15/15, integration-api 35/35, 5 mutations | 0 | COMPLETE_AWAITING_MERGE (D16b idempotency needs a migration: gated)
