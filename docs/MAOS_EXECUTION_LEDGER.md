# MAOS Execution Ledger

Operational execution state for MAOS, kept so that any Claude Code session can resume the exact task without replanning.

- **Not** a product specification: target architecture lives in `docs/MAOS_PRODUCT_BLUEPRINT.md` (Blueprint).
- **Not** the historical Master Doc (claude.ai MAOS Project): that remains history and owner decisions.
- Process rules: the owner-approved MAOS Master Autonomous Build & Completion Protocol v1.0 (2026-10-09).
- Repository code and git history are the source of truth for current implementation; this file records execution state only.
- Until this file is merged into `main`, the live copy is on branch `docs/execution-ledger`; every update is committed there.

---

## RESUME CAPSULE

Read this first on `كمل MAOS`; verify it against `git status`, branch, HEAD and the active PR, and continue from EXACT_NEXT_ACTION. Read deeper sections only if the checks disagree.

| Field | Value |
|---|---|
| CURRENT_PHASE_OR_WAVE | W5: T76 merged; T75 next |
| ACTIVE_TASK | MAOS-T75 customer profitability (starting) |
| TASK_STATUS | T76 COMPLETE_MERGED (#106, 68a8b7e); T75 in progress |
| CURRENT_BRANCH | main |
| HEAD | main = origin/main (after #106 + this ledger PR) |
| MAIN_HEAD_LAST_VERIFIED | `68a8b7e` (#106 merged; main CI green; Railway maos-web SUCCESS; health 200/200; logs clean) |
| PR_URL | none open (T75 PR to follow) |
| PR_STATUS | #106 MERGED |
| CI_STATUS | main green at 68a8b7e |
| COMPLETED_ATOMIC_STEP | #106 merged and verified (deploy, pages, logs, API health) |
| EXACT_NEXT_ACTION | T75 customer profitability (deps T74, T52): per-customer revenue, recorded cost, stored labour, margin from the T74 logic; unrated minutes apart; OWNER only; no migration expected. |
| TESTS_PENDING | none |
| BLOCKERS | none for T74; T69 needs a product decision |
| OWNER_GATE_PENDING | (1) T69 navigation regrouping (product behavior); (2) pmset wake password; (3) D2 off-site setup (open risk); (4) T45 webhook secret; (5) T46 real-data gate |
| LAST_UPDATED | 2026-10-15 |

Standing safety: REAL_CLIENT_DATA_ALLOWED = NO (changes only at gate G-DATA).

## Decision sheet 2026-10-13 (owner)

| # | Decision | Recommendation | Unblocks |
|---|---|---|---|
| 1 | One migration window for #36, #38, #26 and #65 (Customer). Runbooks: `docs/migrations/MIGRATION_GATE_REPORT_2026-10-11.md`, `docs/migrations/T50_CUSTOMER_MIGRATION_GATE.md` | Approve; apply in order #36, #38, #26, #65 after a fresh verified backup | revenue/payment idempotency, email tracking, Customer; then T56 -> T71-T74 |
| 2 | Turn on background jobs: Railway `jihad` variable `MAOS_SCHEDULER_ENABLED=true` (not a secret) | Approve | invite-expiry, deadline/approval reminders |
| 3 | Mac wake for the 03:30 backup: `sudo pmset repeat wake MTWRFSU 03:25:00` | Do it (3-night backup outage 10-11..13 was the Mac sleeping, then Docker down) | reliable nightly backup |
| 4 | D2 off-Mac backup copy (deferred) | Decide now: backups exist only on this Mac | T20 |
| 5 | ADR-009 (Proposed: BullMQ worker) vs D8 in-process scheduler | Amend ADR-009: in-process + advisory locks until a worker-backed feature needs a queue | T125 durable run records (migration) |
| 6 | CLIENT invites (needs `Invite.clientScopeKey`, migration) | Approve with the next migration window | F-2 for clients |
| 7 | ADR-018 open questions (who approves time; per-entry submission; non-billable counts as cost; rates set by OWNER) | Accept the ADR's proposals | T71-T74 after #65 and T56 |
| 8 | ADR-017: CLIENT sees own Customer in the portal? | Later task; name and responsible contact only | portal Customer view |

## Session resume protocol (resume command: `كمل MAOS`)

1. `cd ~/Developer/MAOS/claude`; run only `git status --short`, current branch, HEAD, `origin/main` HEAD if relevant, and the active PR's status.
2. **Fast resume:** read only the RESUME CAPSULE at the top of this file. If the checks match it, continue from EXACT_NEXT_ACTION without reading further history. Escalate (recent git log of the active branch, the active PR/CI, the active task's ledger lines, the relevant Blueprint section - never the whole project) only on a branch/HEAD mismatch, unexpected uncommitted work, a PR merged/closed/changed, main moving under the active task, a changed CI result, or stale/missing capsule state. Reuse recorded test results while the code and HEAD are unchanged.
3. If ACTIVE_TASK is set: continue that task from EXACT_NEXT_ACTION. Never switch tasks because a session restarted.
4. Owner gates are non-blocking when safe work exists: record the gate, mark what it blocks, never cross it or assume approval, and continue with the next dependency-ready task that needs no approval. Stop and wait only when (a) the gate blocks all remaining dependency-ready work, (b) continuing would break task/wave order, (c) the next step needs a merge, deploy, migration, production write, secret, credential, paid service, DNS, destructive or other owner-only action, or (d) there is a real safety or Blueprint conflict.
5. If no task is active and no gate blocks: start the first dependency-ready task in Execution order.
6. If the last session ended without a clean checkpoint: rebuild state from git log, pushed branches, PRs and CI, update the capsule, then continue. When context runs low: finish the current atomic action, update the capsule (branch, HEAD, PR, CI, completed step, EXACT_NEXT_ACTION, tests pending, blockers), commit/push only if already safe, and output a short checkpoint.
7. Read the Blueprint only when the active task needs architecture validation or a conflict appears. Do not re-audit, re-plan or rerun completed tests.
8. Update the RESUME CAPSULE when a task starts, after tests, commit, push, PR, CI results, before an owner gate and before stopping.

## Owner gates and decisions

| ID | Decision / gate | Blocks | Status |
|---|---|---|---|

**Owner decisions 2026-10-10:** #13 APPROVED to merge (only #13). T35 YES (contractors: assigned items only). T36 YES (hide unenforced visibilityScope options). D4/T37 YES (default recipients: invoice's own client scope, ACTIVE users/memberships). T38/T39 YES with verification (no legitimate callers first). D9 YES (per-recipient delivery tracking; migration gate still applies). D16: reject overpayments; add duplicate-payment/idempotency protection (migration gate still applies). T18 YES (Keychain; never print the credential). D1 approved in principle: merge #4 only after green CI and no conflict. DEFERRED: D2, D3, D6. Other PR merges (#5–#12, #14–#19) remain owner-gated.

**Owner batch decisions 2026-10-11:** ADR-017 (Customer) and ADR-018 (TimeEntry/Rate) ACCEPTED. F-2 invite flow APPROVED (single-use tokens, fail closed, existing auth; migration gated). D7 APPROVED (operations-first dashboard; finance per permissions; no speculative metrics). D8 APPROVED in principle (lowest-complexity scheduler, no paid service; new secret/service = gate). T15 branch cleanup APPROVED (merged + two superseded branches, after re-verification). T18 Keychain APPROVED. T21 activation APPROVED. T22 rehearsal APPROVED (isolated only). D2 DEFERRED (risk recorded). D3 KEEP public endpoint for now. D6 DEFERRED. #26/#36/#38 stay migration-gated: one consolidated report requested.

| D1 | Review and merge MAOS-T09 Blueprint (`docs/product-blueprint-v1`) | T11, T13 | OPEN |
| D2 | Off-Mac backup storage target (provider, region, cost) | T20 | OPEN |
| D3 | Keep or close the public PostgreSQL endpoint | T18 design, G-DATA | OPEN |
| D4 | Un-defer invoice default-recipient filtering | T37 | OPEN (deferred) |
| D5 | Repository visibility (currently public) | G-DATA | OPEN |
| D6 | German invoice regime (VAT / Kleinunternehmer, numbering, legal fields) | T41, T42 | OPEN |
| D7 | Dashboard information architecture | T121 | OPEN |
| D8 | Scheduler hosting (in-process vs worker; Railway impact) | T125 | DECIDED 2026-10-11 (in-process, lowest complexity) — IMPLEMENTED (MAOS-D8): advisory-locked, off by default; enabling in production (`MAOS_SCHEDULER_ENABLED=true` on Railway) is an owner action; durable job-run table is migration-gated |
| D9 | Email delivery tracking scope (EmailMessage/EmailEvent) | T44, T45 | OPEN |
| D10 | Staging / preview environment (cost, Railway) | T14 follow-up | OPEN |
| D11 | PR tooling (`gh`) | every task's PR step | RESOLVED 2026-10-09 (gh authenticated; PRs #4–#10 opened) |
| D16 | Payments: overpayment handling (reject vs credit) and repeat-submit idempotency (needs an idempotency key = schema); split out of T34 | finance | OPEN |
| D15 | Prisma major upgrade: remaining API advisories (deepmerge-ts via @prisma/config) need Prisma >6; config-load only | API advisories | OPEN (non-blocking) |
| D14 | Next 16 (major): remaining web advisories are in the postcss 8.4.31 pinned by Next 15 (build-time only for MAOS); fixing them needs a separate major-upgrade task | web advisories | OPEN (non-blocking) |
| D13 | Merge order: T16 and T17 both append to the blocking-gate list in `ci.yml`, and T23 appends to the integration step; later merges need trivial conflict resolution (keep all entries; gate 273, integration 111) | T16/T17/T23 merge | OPEN (mechanical) |
| F-2 | No real invite-acceptance flow exists (placeholder removed in T38); needs a token-verified invite task | invites | IMPLEMENTED (MAOS-F2, no migration): OWNER invites MANAGER/EMPLOYEE/CONTRACTOR; sha256-stored single-use token, 72 h expiry (no existing convention; chosen conservatively, `INVITE_TTL_HOURS`); one 400 INVITE_INVALID for every unusable token; existing email refused (no takeover). GATED: CLIENT invites need `Invite.clientScopeKey` (migration) |
| F-1 | Approving a CLIENT never sets its clientScopeKey, so a UI-approved client gets a fail-closed 403 in the portal (found in T36; needs a task: client onboarding sets the scope / Customer link) | client portal onboarding | FIXED in F-1 PR (approval/role change require clientScopeKey for CLIENT) |
| F-3 | CRM PATCH bodies (meetings, follow-ups, opportunities) and POST /reports are declared as inline types, so no DTO validation runs; an invalid status gives 500 instead of 400. No ID is written on those paths, so no isolation impact (found in T29). Fix: use UpdateOpportunityDto, add update DTOs for meetings/follow-ups and a reports DTO | crm, reports | FIXED in F-3 PR (+ follow-ups page sent invalid DONE status) |
| F-4 | CRUD audit events (projects/tasks/subtasks, CRM, notes, files/approvals, chat/notifications, voice, invoices/payments/finance denials, dashboard/report views) and report hidden-total suppression were specified in Sprints 3–10 but never built; 10 `todo` tests track them. Blueprint §13 requires audit for sensitive state changes | audit, reports | OPEN |
| CI-2 | Local-only intermittent integration failures (about 1 in 6 parallel runs on the Mac): the response body `{"error":"Not found"}` is not produced by MAOS and the API logged no such request — supertest re-listens on an ephemeral port per request and another local process answered. Not seen in GitHub CI. If it appears there: bind each test app once (`app.listen(0, '127.0.0.1')`) in the harnesses | integration tests | RESOLVED 2026-10-11: every harness listens once on 127.0.0.1 (8 consecutive clean local runs) |
| GIT-1 | GitHub email privacy now blocks pushes with the private address. Owner chose (2026-10-11) the repo-local no-reply identity `272799577+Soldado-marketing@users.noreply.github.com` for MAOS commits; global git identity unchanged; only the unpushed T48 commit was re-authored | git | RESOLVED |
| CI-1 | Docker Hub pull rate limit blocked PR CI (2026-10-09). Fixed by T146 (#13 merged); PRs re-triggered and all pass. | — | RESOLVED |
| D12 | Floor order: the protocol's floor diagram puts Operations (My Work, Calendar, Templates, Recurring, Requests) before People & Money, but its wave list puts Calendar, Templates, Recurring and Requests in W6 after W5. This registry follows the wave list. | W5/W6 order | OPEN (non-blocking) |
| G-DATA | Real-client-data readiness | REAL_CLIENT_DATA_ALLOWED | OPEN |
| DOC-HASH-1 | T56 gate doc recorded the migration sha256 prefix as `c63af1c8656f`; the file's real sha256 is `43b7051b6e52ca040910d0c5fcfd7d0024c9c3853b1e25c038c73867127aee1c` (one commit `26c04fb`, never changed). The recorded prefix was a documentation error; the original line is kept and a correction section supersedes it | T56 apply | RESOLVED 2026-10-15 (correction in `docs/migrations/T56_PROJECT_ENRICHMENT_GATE.md`) |
| OPS-MIG-1 | Migration windows of 2026-10-13/14 ran apply/precheck helpers from a session scratchpad (not in Git). Replaced for T56 by reviewed repository scripts `scripts/migrate-deploy-one.sh` and `scripts/db-readonly-check.sh` (tests blocking in CI) | T56 and later windows | RESOLVED 2026-10-15 |

Each schema task also needs OWNER_GATE_MIGRATION before production apply (see Database safety in the protocol).

## Test baseline (MAOS-T39, 2026-10-11)

| Check | Result |
|---|---|
| API full (`npm test`) — **blocking in CI** | 407 tests / 397 pass / 0 fail / 10 todo |
| API blocking gate (ci.yml list) | 297 / 297 |
| Integration (integration-api first, then the security suites) | 221 / 221 |
| Web full (`npm test`) — **blocking in CI** | 75 / 75 |
| Web contract | in the full web suite (also run separately) |
| API / web typecheck and build | PASS |
| NEW_REGRESSIONS | 0 — any failure is now a regression; there are no known failures |

### Todo entries (not failures)

The 10 `todo` tests are features the early sprint specs described but that were never built: CRUD audit events for work, CRM, files/approvals, chat/notifications, voice, finance and dashboards/reports, and report hidden-total suppression. They are tracked as **F-4** and stay visible in every run. Turning one into a real test is part of building that feature.

### History

Until MAOS-T39 the full suites carried 43 API + 3 web known failures (stale source-text assertions from the sprint skeleton design). T39 rewrote each to the current invariant (guards, tenant-scoped queries, client-safe selects, removed placeholders asserted absent) or marked it `todo` (F-4); one hollow assertion that passed on an empty string now checks the real portal selects.

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
| MAOS-D16a | Reject overpayments (row-locked balance check) | fix/reject-overpayment | #32 MERGED (`423ef38`) | finance 15/15; 5 mutations | 0 | COMPLETE_MERGED |
| MAOS-T39 | Stale test triage; full suites blocking | test/stale-baseline-triage | #33 MERGED (`317fc10`) | API 397/0/10 todo; web 75/75 | 0 | COMPLETE_MERGED |
| MAOS-F1 | Client onboarding assigns the client scope (+ contractor access label) | fix/client-onboarding-scope | #34 MERGED (`6447299`) | suite 5/5; web 78/78 | 0 | COMPLETE_MERGED |
| MAOS-F3 | CRM update and report body validation (+ follow-ups status fix) | fix/crm-update-validation | #35 MERGED (`31622ad`) | suite 4/4; web 80/80 | 0 | COMPLETE_MERGED |
| MAOS-T40 | Revenue posting uniqueness (unique RevenueRecord(tenantId, invoiceId)) | schema/revenue-posting-unique | #36 (open, gated) | suite 5/5; 2 mutations | 0 | COMPLETE_AWAITING_MERGE (OWNER_GATE_MIGRATION) |
| MAOS-F5 | Payment amounts as integer cents (payments page used a float) | fix/payment-amount-cents | #37 MERGED (`457cd59`) | web 83/83 | 0 | COMPLETE_MERGED |
| MAOS-T18 | Keychain database credential for backups (code; owner stores the item) | ops/backup-keychain-credential | #40 MERGED (`f43a0fc`) | 37/37 macOS + Linux; 3 mutations | 0 | COMPLETE_MERGED (activation: owner stores the Keychain item) |
| MAOS-D16b | Payment idempotency key (Idempotency-Key header, unique per tenant) | schema/payment-idempotency | #38 (open, gated) | API 6/6, web 86/86; 4 mutations | 0 | COMPLETE_AWAITING_MERGE (OWNER_GATE_MIGRATION; migrate before deploy) |
| MAOS-T47 | Notification writers (re-applied from feat/v2-a1-notifications) | feat/notification-writers | #41 MERGED (`5a04391`) | 8/8 + unit 5/5; 5 mutations | 0 | COMPLETE_MERGED |
| MAOS-T48 | Notification bell in the workspace top bar | feat/notification-bell | #42 MERGED (`0ee5beb`) | web 3/3, 86/86 | 0 | COMPLETE_MERGED |
| MAOS-T59 | Shared DataTable (sorting, pagination; pilot: leads) | feat/data-table | #43 MERGED (`ca227fd`) | web 8/8 | 0 | COMPLETE_MERGED |
| MAOS-T61 | Primitives: unified StatusBadge, ErrorState, DetailPanel, KpiCard | feat/ui-primitives | #44 MERGED (`21f9f7f`) | web 7/7 | 0 | COMPLETE_MERGED |
| MAOS-T65 | Activity timeline API over AuditEvent | feat/activity-timeline-api | #45 MERGED (`c83372c`) | 7/7; 5 mutations | 0 | COMPLETE_MERGED |
| MAOS-T44 | Email delivery tracking per recipient (D9) — migration | feat/email-delivery-tracking | #26 (open) | gate 243/243; integration 104/104; 3 mutations; migration applied only on disposable DBs | 0 | COMPLETE_AWAITING_MERGE (OWNER_GATE_MIGRATION) |
| MAOS-T62 | CRM pipeline board (7 stages, count + per-currency value) | feat/crm-pipeline-board | #46 MERGED (`8a138d4`) | web 5/5 | 0 | COMPLETE_MERGED |
| MAOS-T67 | My Work aggregation API | feat/my-work-api | #47 MERGED (`99c00d7`) | my-work 5/5; 6 mutations | 0 | COMPLETE_MERGED |
| MAOS-T68 | My Work page | feat/my-work-ui | #48 MERGED (`cbe1ef0`) | web my-work 4/4 | 0 | COMPLETE_MERGED |
| MAOS-T60 | FilterBar with URL-held filters and search | feat/filter-bar | #49 MERGED (`b85e371`) | web filter-bar 6/6 | 0 | COMPLETE_MERGED |
| MAOS-T66 | Activity timeline component | feat/activity-timeline-ui | #50 MERGED (`c55d131`) | web activity-timeline 4/4 | 0 | COMPLETE_MERGED |
| MAOS-T132 | Audit log API and owner-only Audit UI | feat/audit-ui | #51 MERGED (`2709dca`) | audit-log 4/4, web 2/2; 3 mutations | 0 | COMPLETE_MERGED |
| MAOS-T49 | ADR-017 Customer entity and client-scope mapping (Proposed) | docs/adr-017-customer | #52 MERGED (`c9c7988`) | docs | 0 | COMPLETE_MERGED |
| MAOS-T70 | ADR-018 Time entries and rate resolution (Proposed) | docs/adr-018-time-and-rates | #53 MERGED (`e6d7b59`) | docs | 0 | COMPLETE_MERGED |
| MAOS-T103 | Calendar aggregation API | feat/calendar-api | #54 MERGED (`88b3aa5`) | calendar 6/6; 5 mutations | 0 | COMPLETE_MERGED |
| MAOS-T104 | Calendar UI (month, week, list) | feat/calendar-ui | #55 MERGED (`0086453`) | web calendar 7/7 | 0 | COMPLETE_MERGED |
| MAOS-T108 | Approval queue; decisions only on open approvals | feat/approval-queue | #56 MERGED (`dcab6d7`) | approval-decisions 5/5, web 4/4; 1 mutation | 0 | COMPLETE_MERGED |
| MAOS-T109 | Meeting notes, decisions and tasks | feat/meeting-decisions | #57 MERGED (`bde94b0`) | foreign-ids-content 19/19, web 4/4; 1 mutation | 0 | COMPLETE_MERGED |
| MAOS-T21 | Backup schedules: rehearsal runner, LaunchAgent templates, installer | ops/backup-schedules | #61 MERGED (`9fcef34`) | backup-schedule 4/4 | 0 | COMPLETE_MERGED |
| MAOS-F2 | Invite flow: OWNER invites, single-use token acceptance | feat/invite-flow | #62 MERGED (`17add82`) | invites 12/12 (4 mutations), web invites 6/6, gate 308, integration 278 | 0 | COMPLETE_MERGED |
| MAOS-D7 | Operations-first dashboard | feat/ops-dashboard | #63 MERGED (`81cc525`) | web 151/151 (ops-dashboard 9), build OK, local stack verified | 0 | COMPLETE_MERGED |
| MAOS-D8 | In-process scheduler with advisory locks; invite-expiry job | feat/scheduler | #64 MERGED (`d0f346b`) | scheduler 6/6 (5 mutations) | 0 | COMPLETE_MERGED |
| MAOS-T142 | Deadline and approval reminders on the scheduler | feat/deadline-reminders | #66 MERGED (`b8001b1`) | deadline-reminders 4/4 (6 mutations) | 0 | COMPLETE_MERGED |
| MAOS-F-UI1 | Define theme colours used by auth and settings screens | fix/theme-token-aliases | #67 MERGED (`e17e0da`) | web 152/152 (theme-tokens guard, mutation-checked) | 0 | COMPLETE_MERGED |
| MAOS-T53 | Customer list UI | feat/customer-list-ui | #83 MERGED (`c274413`) | web customers 6/6 (2 mutations), web 162/162, build OK | 0 | COMPLETE_MERGED |
| MAOS-T63 | Permission-aware global search API | feat/global-search-api | #85 MERGED (`ab3c639`) | global-search 6/6 (4 mutations) | 0 | COMPLETE_MERGED |
| MAOS-T64 | Global search UI and command palette | feat/global-search-ui | (this PR) | web global-search 6/6, web 168/168, local visual check | 0 | COMPLETE_AWAITING_MERGE |

Unregistered branches: `feat/v2-a1-notifications` (A1 writers; superseded by T47 — keep for history, do not merge), `docs/consolidate` (superseded by T12; contains SH Investments content, must not be merged).

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
- MAOS-T39 | Stale test triage; full suites blocking | test/stale-baseline-triage | PR | API 397 pass/0 fail/10 todo, web 75/75 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-F1 | Client onboarding assigns the client scope | fix/client-onboarding-scope | PR | 5/5, web 78/78, 4 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-F3 | CRM update and report body validation | fix/crm-update-validation | PR | 4/4, web 80/80, 3 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T40 | Revenue posting uniqueness (migration) | schema/revenue-posting-unique | PR | 5/5, 2 mutations | 0 | COMPLETE_AWAITING_MERGE + OWNER_GATE_MIGRATION
- MAOS-F5 | Payment amounts as integer cents (web) | fix/payment-amount-cents | PR | money-input 3/3, web 83/83 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-D16b | Payment idempotency key (migration) | schema/payment-idempotency | #38 | API 6/6, web 86/86, 4 mutations | 0 | COMPLETE_AWAITING_MERGE + OWNER_GATE_MIGRATION
- MAOS-T18 | Keychain database credential for backups (code) | ops/backup-keychain-credential | PR | 37/37, 3 mutations | 0 | COMPLETE_AWAITING_MERGE (owner stores the Keychain item)
- MAOS-T47 | Notification writers | feat/notification-writers | PR | 8/8, unit 5/5, 5 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T48 | Notification bell in the shell | feat/notification-bell | PR | web 86/86 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T59 | Shared DataTable | feat/data-table | PR | web 8/8 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T61 | UI primitives | feat/ui-primitives | PR | web 7/7 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T65 | Activity timeline API | feat/activity-timeline-api | PR | 7/7, 5 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T62 | CRM pipeline board (7 stages, count + per-currency value) | feat/crm-pipeline-board | PR | web 5/5 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T67 | My Work aggregation API | feat/my-work-api | PR | my-work 5/5; 6 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T68 | My Work page | feat/my-work-ui | PR | web my-work 4/4 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T60 | FilterBar with URL-held filters and search | feat/filter-bar | PR | web filter-bar 6/6 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T66 | Activity timeline component | feat/activity-timeline-ui | PR | web activity-timeline 4/4 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T132 | Audit log API and owner-only Audit UI | feat/audit-ui | PR | audit-log 4/4, web 2/2; 3 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T49 | ADR-017 Customer entity and client-scope mapping (Proposed) | docs/adr-017-customer | PR | docs | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T70 | ADR-018 Time entries and rate resolution (Proposed) | docs/adr-018-time-and-rates | PR | docs | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T103 | Calendar aggregation API | feat/calendar-api | PR | calendar 6/6; 5 mutations | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T104 | Calendar UI (month, week, list) | feat/calendar-ui | PR | web calendar 7/7 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T108 | Approval queue; decisions only on open approvals | feat/approval-queue | PR | approval-decisions 5/5, web 4/4; 1 mutation | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T109 | Meeting notes, decisions and tasks | feat/meeting-decisions | PR | foreign-ids-content 19/19, web 4/4; 1 mutation | 0 | COMPLETE_AWAITING_MERGE
- 2026-10-11 W4–W7 landing | #42–#57 merged (T48, T59, T61, T65, T62, T67, T68, T60, T66, T132, T49, T70, T103, T104, T108, T109); main CI, Railway and health verified after each | 0 | COMPLETE_MERGED
- MAOS-T15 | Branch cleanup | — (git refs) | — | 62 remote branches deleted after re-verification (60 ancestors of main + docs/consolidate + feat/v2-a1-notifications); the 2 superseded branches preserved first in ~/MAOS_BACKUPS/git-archive/superseded-branches-2026-10-11.bundle (verified, sha256 recorded); kept: main + #26/#36/#38 branches | 0 | COMPLETE
- MAOS-T18 | Keychain credential activated | — (ops) | — | item `maos-backup-database-url` stored via stdin (never in argv/logs/output); stored value verified equal by hash comparison | 0 | COMPLETE
- MAOS-T22 | Production-dump restore rehearsal | — (ops) | — | maos-20261010T013010Z.dump: sha256 MATCH, pg_restore --list OK (429 entries, 43 tables), isolated restore REHEARSAL OK (row counts reported, 8 migrations), 0 leftover containers, protected containers untouched | 0 | PASS
- Migration gate prep | #26/#36/#38 merged up to date with main (merge commits, no rewrite), gate + integration green locally; read-only production prechecks: 8 migrations applied (= main), #36 duplicate groups 0, no new object present | — | — | 0 | REPORT DELIVERED (docs/migrations/MIGRATION_GATE_REPORT_2026-10-11.md)
- D2 risk | Backups exist only on this Mac (and depend on it being awake with Docker running); off-Mac copy deferred by owner 2026-10-11 | — | — | — | OPEN RISK
- MAOS-T21 | Backup schedules: rehearsal runner, LaunchAgent templates, installer | ops/backup-schedules | PR | backup-schedule 4/4 | 0 | COMPLETE_AWAITING_MERGE
- Backup outage 2026-10-11..13 | Nightly runs failed 10-11 and 10-12 (SSL EOF on every retry: the Mac slept mid-dump) and 10-13 (Docker Desktop not running); newest good dump was 10-10. Recovery 2026-10-13: Docker restarted; manual backup with the reviewed origin/main runner under `caffeinate -i` → maos-20261013T114512Z.dump SUCCESS (sha256 written, retention applied); its isolated rehearsal REHEARSAL OK. Fix: scheduled runs now wrap in `caffeinate -i` (#61) | — | — | 0 | RESOLVED (pmset wake still owner action)
- MAOS-T21 activation 2026-10-13 | `install-backup-schedule.sh` pinned runtime 9fcef34 (origin/main) into ~/MAOS_BACKUPS/runtime; replaced the old out-of-repo wrapper agent (old plist backed up in launchd-backup/). launchctl: backup (daily 03:30, caffeinate), backup-staleness (every 3600 s), restore-rehearsal (Sun 05:15, caffeinate) all loaded, next runs registered. Staleness agent kickstarted: exit 0 ("newest verified backup … 0h old"). Forced failure test (limit 0 h): alert line in logs/alerts.log + macOS notification, exit 1 as designed. Production unaffected: health 200, ready 200 (read-only pg_dump only) | — | #61 | 0 | COMPLETE
- MAOS-F2 | Invite flow: OWNER invites, single-use token acceptance | feat/invite-flow | PR | invites 12/12 (4 mutations), web invites 6/6, gate 308, integration 278 | 0 | COMPLETE_AWAITING_MERGE
- MAOS-D7 | Operations-first dashboard | feat/ops-dashboard | PR | web 151/151 (ops-dashboard 9), build OK, local stack verified | 0 | COMPLETE_AWAITING_MERGE
- MAOS-D8 | In-process scheduler with advisory locks; invite-expiry job | feat/scheduler | PR | scheduler 6/6 (5 mutations) | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T50/T51/T52 | Customer entity (ADR-017): schema + idempotent backfill + /customers API | schema/customer | #65 DRAFT (GATED, do not merge) | customers 9/9 (6 mutations), isolation 80/80 before and after a real backfill, gate 308, integration 293 | 0 | GATED_MIGRATION (docs/migrations/T50_CUSTOMER_MIGRATION_GATE.md)
- T71/T72/T73 status | Not started: T71 depends on T56 (project enrichment schema), which depends on T50 (#65, gated). Building them now would stack branches on a gated PR (forbidden) | — | — | — | — | BLOCKED_BY_GATE (#65)
- MAOS-T142 | Deadline and approval reminders on the scheduler | feat/deadline-reminders | PR | deadline-reminders 4/4 (6 mutations) | 0 | COMPLETE_AWAITING_MERGE
- MAOS-F-UI1 | Define theme colours used by auth and settings screens | fix/theme-token-aliases | PR | web 152/152 (theme-tokens guard, mutation-checked) | 0 | COMPLETE_AWAITING_MERGE
- 2026-10-13 wrap-up | #61 T21, #62 F-2, #63 D7, #64 D8, #66 T142, #67 theme colours merged and verified; #65 Customer opened as gated draft; #26/#36/#38/#65 merged up to date with main (merge commits) and green locally (gate 308-312, integration 291-297, full API 0 failures) | — | — | 0 | ALL_REMAINING_GATED
- 2026-10-13 owner batch | D8 enabled (Railway `MAOS_SCHEDULER_ENABLED=true`, deploy SUCCESS, `scheduler_started` with both jobs, health 200/200); ADR-009 amended (#69); CLIENT invites (F2b) added to gated #65 with migration `20261013212118_add_invite_customer`; read-only prod prechecks: #36 duplicates 0, all new objects absent, 0 client keys; per-migration order rehearsed on PG18 (13 applied, 0 failed) | — | — | 0 | IN_PROGRESS
- 2026-10-14 owner batch result | D8: `MAOS_SCHEDULER_ENABLED=true` on `jihad`; prod logs: invite-expiry succeeded 22:05 and 22:20 (affected 0), deadline-reminders succeeded 22:20 (affected 0); one run per round (1 replica, advisory lock taken), no duplicates, 0 error lines | #69 ADR-009 amended; #70 consolidated migration gate report; #71 MAOS-T20 off-site encrypted copy + rehearsal (8/8, 4 mutations; runtime reinstalled at 93687c2; silent until configured); #72 ADR-018 labour-cost helpers (7/7, 4 mutations); #73 CI image mirror.gcr.io (same digest) | — | 0 | COMPLETE
- D2 | Code merged (#71); activation waits for the owner setup gate `docs/ops/OFFSITE_BACKUP_SETUP.md` (provider/account/bucket/key/escrow) | T20 | — | — | OWNER_GATE
- pmset wake | `sudo pmset repeat wake MTWRFSU 03:25:00` started in the owner's Terminal tab; waiting for the admin password (not entered by Claude) | T21 | — | — | OWNER_ACTION
- 2026-10-14 migration window | Owner approved the audited window. Reconciliation: branch heads = audited heads, CI SUCCESS, main ahead by docs only. STOPPED before step 1 (no backup taken, no production change): the report requires writes frozen for #36 without defining how; definition proposed in #76 for owner approval | — | #76 | 0 | STOPPED_BEFORE_PRODUCTION
- 2026-10-14 window step 1 (#36) | NEW backup maos-20261014T144626Z.dump: sha256 MATCH, pg_restore --list 414/43, isolated restore OK; prechecks: 8/0 migrations, dup groups 0, index absent, long xacts 0; applied 20261011085435_revenue_record_unique_invoice (SHARE ROW EXCLUSIVE + in-lock check); post: 9/0, index valid+unique, dup 0, rows unchanged, no lock left; PR #36 merged 0e70d1d; CI/Railway/health/logs OK | #36 | — | 0 | DONE
- 2026-10-14 window step 2 (#38) | NEW backup maos-20261014T145600Z.dump: sha256 MATCH, list 415/43, isolated restore OK; prechecks 9/0, objects absent; applied 20261011090404_payment_idempotency_key; post 10/0, column TEXT NULL, unique index valid, 2 payments (keys NULL) unchanged; PR #38 merged 77367f7 after the schema (14:56:17 < 14:56:55); smoke: no production payment written (safer option), route 401 unauthenticated, replay proven by CI/rehearsal | #38 | — | 0 | DONE
- 2026-10-14 window step 3 (#26) | NEW backup maos-20261014T151903Z.dump: sha256 MATCH, list 416/43, isolated restore OK; prechecks 10/0, objects absent; applied 20261010134025_add_email_delivery_tracking; post 11/0, enum 6 values, EmailMessage/EmailEvent, 6 indexes, 2 cascade FKs, 0 invalid indexes, data unchanged; PR #26 merged a9b9040 after the schema (15:19:26 < 15:19:44); deliveries route 401 unauthenticated; send fail-safe proven by CI test | #26 | — | 0 | DONE
- 2026-10-14 window step 4 (#65a) | NEW backup maos-20261014T152821Z.dump: sha256 MATCH, list 429/45, isolated restore OK; prechecks 11/0, objects absent, distinct client keys 0; applied 20261013123256_add_customer (checkout ba05df2 with the invite folder removed locally); post 12/0, CustomerStatus enum, nullable customerId on Project/Invoice/FileAsset, 7 indexes, FKs NO ACTION, 0 invalid; fill-in 0 created/0 changed, re-run 0/0; wrong mappings 0, unlinked 0; observation: 1 pre-existing CLIENT membership without a key (fail-closed, unchanged); #65 code not deployed | #65 | — | 0 | DONE
- 2026-10-14 window step 5 (#65b) + #65 deploy | NEW backup maos-20261014T152956Z.dump: sha256 MATCH, list 444/46, isolated restore OK; prechecks 12/0, column absent, Customer present, 0 invites; applied 20261013212118_add_invite_customer (finished 15:30:20Z); post 13/0, Invite.customerId TEXT NULL, index, FK NO ACTION, 0 invalid; #65 marked ready and merged c3b593f (deploy 15:35:06Z, after both #65 migrations); routes: /customers 401, /admin/invites 401, invite preview bad token 400, web invites 200; logs 0 errors; prod migrate status vs main: 13, up to date | #65 | — | 0 | DONE
- MIGRATION GATE COMPLETE 2026-10-14 | #36 -> #38 -> #26 -> #65a -> #65b applied in order, five distinct fresh backups (144626Z, 145600Z, 151903Z, 152821Z, 152956Z), each sha256 + pg_restore --list + isolated restore verified; #36 with the technical SHARE ROW EXCLUSIVE freeze; every PR's code deployed only after its schema (finish < deploy times recorded); no migrate resolve, no rollback, no destructive action. Safer choices recorded: no production payment written for the #38 smoke (CI/rehearsal prove replay); authenticated Customer/invite flows verified by CI + rehearsal, production checked with unauthenticated route probes and read-only invariants. Open: D2 off-site copy not configured; pmset wake pending | — | — | 0 | COMPLETE
- MAOS-T53 | Customer list UI | feat/customer-list-ui | PR | web customers 6/6 (2 mutations), web 162/162, build OK | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T63 | Permission-aware global search API | feat/global-search-api | PR | global-search 6/6 (4 mutations) | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T64 | Global search UI and command palette | feat/global-search-ui | PR | web global-search 6/6, web 168/168, local visual check | 0 | COMPLETE_AWAITING_MERGE
- 2026-10-14 post-gate work | #83 T53 customer list UI; #85 T63 permission-aware search API (4 mutations); #86 T64 search UI/command palette (portal + autofocus bugs found in local visual check); #84 T56/T57 project enrichment prepared as gated draft (5 mutations, budget OWNER-only, 322/322 integration); dependency scan: no ungated dependency-ready task left | — | #83 #85 #86 | 0 | IDLE_AWAITING_OWNER
- 2026-10-15 checkpoint | #84 re-audited SAFE TO APPROVE at 74f029c (reconciled with main, delete returns id only, 9/9 + 5 mutations); PG18 rehearsal: T56 only pending, 14/0, 0 rows changed, old+new code 0 failures, health 200; #88 fixed the customer fill-in test race (3x722 tests, 0 fail); no production change | #84 #88 | — | 0 | AWAITING_OWNER
- MAOS-T56 | Project enrichment schema (migration 20261014155254_project_enrichment, sha256 43b7051b6e52ca040910d0c5fcfd7d0024c9c3853b1e25c038c73867127aee1c) | schema/project-enrichment | #84 MERGED (`2d99848`) | prod precheck 13/0 -> APPLY OK -> postcheck 14/0, 5 nullable columns, 3 indexes, FK SET NULL validated, 0 invalid indexes, 0 rows with new values, row counts unchanged | 0 | COMPLETE_MERGED (applied 2026-10-15)
- MAOS-T57 | Project enrichment API | schema/project-enrichment | #84 MERGED (`2d99848`) | project-enrichment 9/9 (5 mutations); main CI green; Railway jihad SUCCESS on 2d99848 (one deploy), health 200/200, logs 0 errors | 0 | COMPLETE_MERGED
- 2026-10-15 T56 window | Owner approved window + step 5. Fresh backup `maos-20261015T104929Z.dump` (SUCCESS, sha256 MATCH, pg_restore --list 446 entries/46 tables, REHEARSAL OK) -> T56_precheck 13/0, 0 columns/indexes -> `migrate-deploy-one.sh check` CHECK OK -> `apply` (clean worktree ~/Developer/MAOS/windows/T56 at cf2d9a3, exact-command permission rule only) APPLY OK -> T56_postcheck OK -> health 200/200 -> #84 merged -> main CI green, Railway SUCCESS, health 200/200, logs clean. Web SKIPPED (no apps/web change). Earlier apply attempts in this window were blocked by the session permission check while they used scratchpad helpers; replaced by reviewed repo scripts (OPS-MIG-1) and the hash note corrected (DOC-HASH-1)
- MAOS-T54 | Customer 360 aggregation API (`GET /api/customers/:id/overview`; sections projects/tasks/files/approvals/invoices/finance by live permission + contractor work scope; money OWNER only; meetings not linked to customers in the schema, so not included - needs a future schema task) | feat/customer-360-api | PR | customer-overview 8/8 (7/7 mutations caught); integration 35 + 302, full API 454 / 0 fail / 10 todo; build typecheck OK | 0 | COMPLETE_AWAITING_MERGE
- MAOS-T58 | Project enrichment UI (list on DataTable/FilterBar with number, customer, service, responsible, progress, status, deadline, OWNER-only budget; detail panel + edit form) | feat/project-enrichment-ui | #92 | web projects 8/8 (3/3 mutations), web 176/176, build OK; no local visual check yet | 0 | COMPLETE_AWAITING_MERGE
- F-5 (found in T58) | The T53 customers page passes a filter accessor that returns null for its search keys (name, clientScopeKey), so text search on /customers matches only industry. Fix: accessor that returns those fields (as lib/projects.ts projectField does) + a test | web customers | OPEN
- MAOS-T54 merge | #91 MERGED (`c18bca5`) 2026-10-15: main CI green; Railway jihad SUCCESS on c18bca5; health 200/200; unauthenticated overview 401. Log check: first read showed 1 line matching exception (LIKELY the warn line of that 401 probe; Railway CLI then stopped answering, not re-verified) | 0 | COMPLETE_MERGED
- MAOS-T55 | Customer 360 UI (`/customers/[id]`: Overview with KPI row, OWNER-only finance totals, upcoming tasks, open approvals, invoices, customer activity timeline; Projects, Files, Notes tabs shown only for sections the API sent; list names link to it). API: activity timeline gains `customer` (the customer's own events, CUSTOMER read) | feat/customer-360-ui | PR | web customer-360 5/5 (3/3 mutations), web 173/173, build OK; activity-timeline 8/8; integration 35 + 303 x3 clean, full API 454/0 fail/10 todo | 0 | COMPLETE_AWAITING_MERGE
- CI-3 (2026-10-15, local only) | One CI-equivalent local run failed the whole customer-overview suite and one scheduler test (invite-expiry); three reruns of the same sequence were clean and GitHub CI on #91/main was green. Login throttling ruled out (in-memory per suite process). Not reproduced; watch for it in CI | integration tests | OPEN (monitor)
- #91 log re-check (2026-10-16) | `railway logs --lines` (non-streaming; the earlier hangs were streaming mode) on deployment ae021adc: 1 start, no restart, 117 INFO, 2 WARN = `REDIS_URL is not set` (expected) and the 401 of the unauthenticated probe `/api/customers/x/overview`. CLEAN | — | VERIFIED
- Runtime check #92 + #93 (2026-10-16) | Local API (#93 branch) + Next dev per branch on a disposable PostgreSQL 18 with seeded tenants/roles. #92: list values, progress, OWNER budget column, MANAGER none (API body has no budgetCents), filters + search in URL, overdue red / due-soon amber / archived none, OWNER edit (cents 350050, client key derived by server), MANAGER edit (no budget field, responsible read-only: /users/members is OWNER-only), console no errors -> PASS. #93: counts and OWNER finance totals exact, tabs per section (EMPLOYEE with project deny: no Projects tab), no amounts for MANAGER/EMPLOYEE, timeline customer-scoped, CONTRACTOR/CLIENT 403, foreign tenant 404 -> found 2 UI bugs (budget replaced status in Projects tab; duplicate Activity heading), fixed in `aa64e9c` with regression tests, rechecked -> PASS | — | VERIFIED
- F-5 | Fix in #94 (fix/customers-search, from main c18bca5): customerField accessor; web customers 8/8, web 170/170 | web customers | FIXED (#94 merged 7996ba4)
- 2026-10-16 merges (owner approved order #92, #94, #93) | #92 T58 MERGED `e21e1ba` (main CI green; maos-web SUCCESS; jihad SKIPPED, web only; /projects 200; web logs 0 errors). #94 F-5 MERGED `7996ba4` (main CI green; maos-web SUCCESS; /customers 200; logs 0 errors). #93 reconciled with main in `ce6315f` (no conflicts; customers/page.tsx auto-merged keeping customerField + 360 link; web 184/184, build, PR CI green) -> MERGED `01cba31` (main CI green; jihad + maos-web SUCCESS; health 200/200; /api/activity/customer/x 401 unauthenticated; API logs: 1 start, only the expected REDIS_URL warning; web logs 0 errors) | 0 | COMPLETE_MERGED (T58, T55, F-5)
- MAOS-T118 | CSV import/export for customers, projects, tasks (`GET /api/data/export/:type`, `POST /api/data/import/:type` {csv, commit}; web `/data`). Export: READ on the type + contractor work scope; e-mail columns only with MEMBERSHIP read; budgetCents only for the ACTIVE OWNER (same rule as T57); formula injection neutralised. Import: CREATE on the type; create-only; no ids in files (customers by clientScopeKey, projects by projectNumber, people by e-mail, all looked up in the caller's tenant); whole file validated first, any error -> report and nothing written; valid file in one transaction (P2002 -> 409, nothing written); duplicates existing or in-file are errors; strict dates/cents/enums; 96 000 chars, 500 rows; audit `export.*`/`import.*`. No migration | feat/csv-import-export | #96 MERGED (`8e75395`) | csv 7/7; data-transfer 16/16 HTTP; 11/11 mutations; web data-transfer 5/5, web 189/189, build; gate 351/351; integration 35 + 319 (4/5 clean runs, see CI-4); full API 461/0 fail/10 todo; runtime check PASS; main CI green; Railway jihad + maos-web SUCCESS on 8e75395; health 200/200; /data 200; export/import 401 unauthenticated; API logs 1 start + expected REDIS_URL warning only; web logs 0 errors | 0 | COMPLETE_MERGED
- Runtime check #96 (2026-10-16) | Local API + Next dev at #96 head 5bd07a0 on a disposable PostgreSQL 18 with two tenants and every role. API probe 50/50: export headers/values per role (e-mail + budget only OWNER, formula escaped, tenant-only rows, CONTRACTOR only P-0001), CLIENT 403 on all, cross-tenant key/number unknown, duplicates, malformed CSV, strict dates/cents, nothing written by any invalid file, role import rules, valid imports create the expected rows, export -> import round trip, write failure -> 500 + full rollback. Browser (OWNER, MANAGER, CONTRACTOR, CLIENT): export downloads, check -> report -> Import disabled, new file clears report, imports create rows, CONTRACTOR non-member refused, CLIENT no /data link; console clean. Found 3 UI text bugs ("Import 1 rows"; owner-only columns listed to every role; "export can be imported as is" untrue for a create-only import) -> fixed with regression tests (web 8/8, web 192/192, build) | — | VERIFIED
- MAOS-T71 | TimeEntry + Rate schema (ADR-018): migration 20261016133407_time_entries_and_rates (sha256 9522fb633c1a31cffdaf7b625f3e12449995149692feaecbeb5bcc21eac4d441), additive: 2 enums, 2 tables, 7 indexes, 7 FKs (tenant CASCADE; member/project NO ACTION; task/customer SET NULL), 5 CHECKs (minutes 1-1440, cents >= 0, frozen rate complete or absent, rate scope shape). Gate doc docs/migrations/T71_TIME_ENTRIES_GATE.md; prod precheck read-only 14/0, tables/types absent | schema/time-entries | draft PR (GATED) | time-entry-schema 7/7 (4/4 mutations); current code on new schema PG16 + PG18: integration 35 + 326, full API 461/0 fail; no drift | 0 | AWAITING_OWNER_MIGRATION_APPROVAL
- T71 first audit (2026-10-16) | NOT SAFE TO APPROVE for the draft above (sha256 9522fb63...4d441): on a disposable database (1) duplicate Rate rows with the same workspace, scope target and validFrom were accepted at every scope (ADR-018 resolution not deterministic); (2) costCents was not tied to the ADR-018 formula (60 min at 3000 cents/h stored with cost 1). Owner ordered both fixed in the same unapplied migration | — | RECORDED
- MAOS-T71 amendment (2026-10-16) | Same migration file amended (never applied to a persistent database: prod precheck absent, Railway production-only and no auto-migrate, local dev DB no T71 row, other DBs disposable). Rate.scopeKey NOT NULL (TENANT / ROLE:<role> / MEMBER:<userId>) + Prisma @@unique(tenantId, scopeKey, validFrom) + Rate_scope_key_check (IS NOT DISTINCT FROM); TimeEntry_cost_formula_check costCents = (minutes::bigint * rateCents::bigint + 30) / 60. New sha256 489d6f63618edf030928de00039e532fcf0de1d3f6077ee7a6f1bc824b93fd7f; 7 FKs, 7 CHECKs, 9 indexes; no drift | schema/time-entries | #98 draft (GATED) | time-entry-schema 10/10; 9/9 mutations (incl. unique key, formula, +30, bigint); PG16 + PG18: integration 35 + 329, full API 461/0 fail; gate 351/351 | 0 | COMPLETE_MERGED (applied 2026-10-16, #98 e249c1e)
- 2026-10-16 T71 window (owner approved, hash 489d6f63618edf030928de00039e532fcf0de1d3f6077ee7a6f1bc824b93fd7f, PR #98) | #98 head 39d304d re-confirmed (hash, current with main, CI green). Fresh backup `maos-20261016T145955Z.dump` (SUCCESS, sha256 MATCH 528c7e86..., pg_restore --list 450 entries / 46 tables, REHEARSAL OK) -> T71_precheck 14/0, T71 tables/types 0, long_xacts 0 -> `migrate-deploy-one.sh check` CHECK OK (only T71 pending) -> one-time exact-command rule -> `apply` APPLY OK (once) -> rule removed -> T71_postcheck 15/0, TimeEntry + Rate, 7 FKs, 7 CHECKs, 9 indexes (unique rate key 1), 0 invalid, 0 entries / 0 rates, counts unchanged (1/2/1/1/0) -> health 200/200 -> #98 MERGED `e249c1e` -> main CI green; Railway jihad SUCCESS on e249c1e (maos-web SKIPPED, no web change); health 200/200; web 200; API logs 1 start, only REDIS_URL warning | 0 | COMPLETE_MERGED (T71 applied)
- MAOS-T72 | TimeEntry API (`/api/time-entries`: list/get/create/patch/delete + submit/approve/reject). New TIME_ENTRY resource in MANAGER, EMPLOYEE, CONTRACTOR policies (OWNER baseline, CLIENT none). Own entries for every internal role; OWNER/MANAGER read all and approve/reject SUBMITTED; edit/delete own DRAFT or REJECTED only (REJECTED edit -> DRAFT; APPROVED/BILLED locked; BILLED not reachable in T72). Project/task in tenant, task in project; CONTRACTOR on member projects or assigned tasks; customer from the project. Rate/cost never accepted, stored unrated (freezing is T73), returned to OWNER only. Conditional state updates -> 409; DB check refusals -> 400 TIME_ENTRY_INVALID; project with time -> 409 PROJECT_HAS_TIME_ENTRIES. Audit time_entry.*. No migration | feat/time-entry-api | #100 MERGED (`da1e6ca`) | time-entries 15/15 HTTP; 12/13 mutations (survivor: service CLIENT check masked by the permission guard); gate 351/351; integration 35 + 344; full API 461/0 fail | 0 | COMPLETE_MERGED (main CI green; Railway jihad SUCCESS on da1e6ca; health 200/200; all /api/time-entries routes 401 unauthenticated, no 5xx; logs 1 start, only REDIS_URL warning)
- MAOS-T73 | Rate resolution and freezing (ADR-018 §2-§5). `/api/rates` list/create/patch/delete + `POST /api/rates/rerate`: RATE resource (sensitive, in no role policy) + database ACTIVE OWNER check (custom grants do not open it); scopeKey derived server-side; one rate per workspace/target/day (409 RATE_EXISTS); rateCents 0..89 478 485 (full-day cost fits the integer column); EUR only. Time entries freeze member -> role -> tenant (newest validFrom <= entry day) with costCents = floor((minutes x rate + 30) / 60) on create; no source = unrated; a draft minutes edit recomputes cost from the frozen rate; date change keeps the frozen rate; rate edits/deletes never touch entries; OWNER re-rating of a date range (never BILLED, max 1000) with time_entry.rerated audit per changed entry (before/after). No migration | feat/rate-resolution | #102 MERGED (`0c44872`) | rates 9/9 + time-entries 16/16 HTTP; rate-resolution unit 5/5; 13/13 mutations (after tightening the cross-tenant test that first let a missing tenant filter survive); gate 356/356; integration 35 + 354; full API 466/0 fail | 0 | COMPLETE_MERGED (main CI green; Railway jihad SUCCESS on 0c44872; health 200/200; /api/rates, /api/rates/rerate, /api/time-entries 401 unauthenticated, no 5xx; logs 1 start, only REDIS_URL warning)
- MAOS-T74 | Labour cost in project profitability (ADR-018 §6). /api/finance/profitability per project and /api/finance/summary: cost = recorded CostRecords + sum of costCents STORED on time entries (billable and non-billable, every status: ADR §6 does not restrict status); Rate table never read; unrated minutes (costCents null) reported separately, incomplete = true (cost lower bound, margin upper bound); projects with labour only appear; new fields recordedCostCents, labourCostCents, ratedMinutes, unratedMinutes, incomplete; OWNER-only via the existing sensitive FINANCE routes; uses labour-cost.ts summariseLabour. Web finance page and owner KPI card show totalCostCents (now incl. labour) but not the incomplete flag yet -> T76. No migration | feat/labour-profitability | #104 MERGED (`995c53d`) | finance-labour 5/5 HTTP; labour-profitability unit 4/4; phase-4 47/47, labour-cost 7/7; 6/6 mutations; gate 360/360; integration 35 + 359; full API 470/0 fail; web 192/192 | 0 | COMPLETE_MERGED (main CI green; Railway jihad SUCCESS on 995c53d; health 200/200; finance/rates/time-entries routes 401 unauthenticated, no 5xx; logs 1 start, only REDIS_URL warning)
- MAOS-T76 | Time & Costs UI (Blueprint §15): /time timesheet (log, edit, delete, submit own time; OWNER/MANAGER see all, Member column, approve/reject submitted; filters status/project/member + date range; totals hours/billable; OWNER-only cost column, labour total and "without a rate" minutes); project page OWNER-only profitability preview (revenue, recorded, labour, contribution, margin; <= and note when incomplete; renders nothing when the API refuses); finance page shows labour in total costs, ">=" and an incomplete banner; navigation "Time & Costs". Rates admin UI not in the T76 definition | feat/time-costs-ui | #106 MERGED (`68a8b7e`) | web time-entries 8/8 (4/4 mutations after adding 1.33/0.01 duration cases), web 200/200, build OK; runtime check on a disposable DB: EMPLOYEE own entries only, no cost, form logs 0:45 with frozen ROLE rate; OWNER sees member/cost/unrated, approves; preview and finance banner correct; console clean | 0 | COMPLETE_MERGED (main CI green; Railway maos-web SUCCESS on 68a8b7e, jihad SKIPPED (web only); /time, /projects, project page, /finance, /dashboard 200; web logs 0 errors; API health 200/200)
- F-6 (found in T74) | Duplicate rate/cost helpers: apps/api/src/modules/rates/rate-resolution.ts (T73, live) re-implements resolveRate/entryCostCents that already existed in apps/api/src/modules/finance/labour-cost.ts (schema-free groundwork, tested). Both are tested and agree, but two implementations can drift. Fix: one canonical module (keep the ADR-018 helpers in one place, have rates and finance import it), tests merged; no behaviour change | api rates/finance | OPEN
- Owner question (T74) | ADR-018 §6 counts the stored cost of every time entry in project cost, including DRAFT and SUBMITTED (not yet approved) and REJECTED entries. T74 follows that literally. If profitability should count only APPROVED/BILLED time, that is a product decision (change in profitability grouping only, no migration) | finance | DECIDED 2026-10-16 (owner): keep the ADR-018 rule, all stored time counts in profitability
- CI-3 root cause (2026-10-16) | customers.test ran the customer fill-in over every tenant while other suites seeded client keys in parallel, so a suite's own customer create could clash with a Customer the fill-in had just made (seen in customer-overview, data-transfer). Fix in the T118 PR: backfillCustomers takes an optional tenantIds (command line unchanged: still every tenant), and customers.test passes its own two tenants; a test proves the default stays global | integration tests | FIXED (#96 merged 8e75395)
- CI-4 (2026-10-16, local only) | 1 of 5 local CI-equivalent runs failed payment-idempotency "refuses a malformed key ... without a key unchanged"; not reproduced in 4 further runs, error not captured; the test is scoped to its own invoice and T118 does not touch payments | integration tests | OPEN (monitor)
- Housekeeping 2026-10-16 | ~/Developer/MAOS/windows/T56 worktree removed after checking: clean, no untracked files, HEAD cf2d9a3 contained in main, no stash | — | DONE
