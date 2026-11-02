# MAOS Master Task List

The complete approved MAOS development backlog (Master Development Plan, owner directive of 2026-11-02), reconciled against what is already merged and deployed. One row per task. This file is the backlog of record; `docs/MAOS_PROGRESS.md` is the chronological log and `docs/MAOS_RESUME.md` is the continuation checkpoint. History before 2026-11-02 stays in `docs/MAOS_EXECUTION_LEDGER.md`.

Rules that apply to every row: fictional data in isolated environments only; `REAL_CLIENT_DATA_ALLOWED = no`; merges, deploys, migrations, secrets, paid services, DNS and production writes are owner actions (one owner message per merge); isolated results are never reported as production acceptance.

## Status vocabulary

| Status | Meaning |
|---|---|
| DONE | Acceptance criteria met; merged and verified in production where applicable |
| DONE_ISOLATED | Verified only on an isolated stack with fictional data; production acceptance still open |
| IN_PROGRESS | Being worked on now (at most one at a time; see RESUME) |
| READY | Dependencies met, no approval needed, not started |
| PARTIAL | Some of the scope exists; remaining scope listed in notes |
| BLOCKED_OWNER | Needs an owner decision, credential, account or production action; marked, never crossed |
| NOT_STARTED | Nothing exists yet and the task is not yet dependency-ready or not yet in the active phase |
| N/A | Not applicable to MAOS code; documented why |

Evidence words: PASS / FAIL / NOT VERIFIED (production) — never upgrade NOT VERIFIED to PASS without a production check.

## Phase and order

Phase 1 Stability (A → B) · Phase 2 Core company architecture (J) · Phase 3 Existing product (C → D → E → F → M) · Phase 4 Finance (K) · Phase 5 AI Assistant (L) · Phase 6 Platform (G) · Phase 7 Branding (H) · Phase 8 Website (I, separate project). Within a phase, confirmed security and data-integrity issues first. A BLOCKED_OWNER row never blocks the next READY row.

---

## A — Acceptance & Release Quality (P0)

| ID | Task | Status | Deps | Notes / implementation | Tests & acceptance | PR / commit | Production |
|---|---|---|---|---|---|---|---|
| A01 | Verify Owner workflows in production | PARTIAL | — | V1 owner-verified 2026-10-31 (ledger). V2 (#129, #130, #131: deliveries, invoices with partial payments, filming appointments, notifications, problem reports) has only unauthenticated production probes | Owner walks the V2 checklist in `docs/MAOS_PROGRESS.md` (2026-11-02 entry) on production with the owner account; PASS when every row is ticked | #129 `81843dd`, #130 `83b9be8`, #131 `de2ee1b` | NOT VERIFIED for V2 — owner session needed |
| A02 | Employee and Client acceptance | DONE_ISOLATED | A01 | Isolated stack 2026-11-02: client (phone) reports a problem, reads the answer, never sees staff names or internal notes; employee has no problem-reports entry and `GET /complaints` is refused; client sees only own invoices/deliveries | Suites `security-gate-client-complaints` (10), `security-gate-client-isolation`, client-portal-v2 web tests, all in CI | #131 | NOT VERIFIED — production has no test accounts and real client data is not allowed; owner decides: (a) accept isolated evidence, or (b) create one fictional production client + employee account under the owner's tenant |
| A03 | Manager and Contractor roles | DONE_ISOLATED | A01 | Manager: receives complaint notices, answers, leaves internal notes, resolves (isolated browser flow). Contractor: explicit per-company grants in #124, chat scope tests | #124 tests in CI, complaints suite | #124, #131 | NOT VERIFIED — same decision as A02 |
| A04 | PASS / FAIL / NOT VERIFIED evidence and closure | IN_PROGRESS | A01–A03 | Evidence lives in this file's Production column and in `docs/MAOS_PROGRESS.md`; acceptance requirements of 2026-11-02 (video, persistence, critical notifications, Drive privacy) recorded there | Closed when A01–A03 leave NOT VERIFIED or the owner accepts isolated evidence in writing | — | — |

## B — Security & Infrastructure (P0)

| ID | Task | Status | Deps | Notes / implementation | Tests & acceptance | PR / commit | Production |
|---|---|---|---|---|---|---|---|
| B01 | Off-site backups and restore procedure | BLOCKED_OWNER | D2 decision | Nightly dump through Railway's private tunnel (R01, #111) runs on the owner Mac: four SUCCESS runs on 2026-11-02, sha256 + `pg_restore --list` + isolated REHEARSAL OK each time. Off-site encrypted copy is coded (`scripts/offsite-backup.sh`, `offsite-rehearsal.sh`, `offsite-setup-keys.sh`, #71) but inactive until the owner provides provider, account, bucket and key per `docs/ops/OFFSITE_BACKUP_SETUP.md` (paid service = gate). Standing risk: backups exist only on one Mac that must be awake with Docker running | Activation acceptance: one encrypted off-site object per night, `offsite-rehearsal.sh` restores it in isolation, staleness alert fires when a night is missed | #71, #111 | Local backups PASS; off-site NOT CONFIGURED |
| B02 | RESEND_API_KEY security and rotation | BLOCKED_OWNER | — | Key exists on service `jihad`; sender domain verified in Resend; mail leaves over HTTPS only. Rotation after the 2026-10-21 Railway disclosure: JWT_SECRET and database password rotated 2026-10-31; the Resend key is still the pre-incident key (UNVERIFIED otherwise). Claude cannot create or read the key | Owner: create a new key in the Resend dashboard → set `RESEND_API_KEY` on `jihad` → redeploy → send one test invoice e-mail to an owner address → delete the old key. Evidence: Resend shows one active key created after 2026-10-21 | — | NOT VERIFIED |
| B03 | PostgreSQL least-privilege access | BLOCKED_OWNER (design + rehearsal done) | O10 | Public TCP proxy removed; access only through Railway's private network/tunnel (#121). Today one administrator role serves the API, migrations and backups; the API runs no DDL (raw SQL is DML only). Design + SQL runbook + rehearsal + rollback: `docs/security/postgres-least-privilege-plan.md` (roles `maos_app` DML-only with default privileges, `maos_backup` = `pg_read_all_data`, administrator kept for `migrate-deploy-one.sh`). Rehearsal 2026-11-02 PASS (PROGRESS): 35/35 + 456/458 as `maos_app` (2 expected test-only trigger-DDL failures), all negative checks denied, dumps identical (523/48), default privileges work. Applying in production = owner window O10 (roles + `DATABASE_URL` + Keychain) | Rehearsal done; production acceptance: readiness 200, no `permission denied` in logs, nightly backup SUCCESS as `maos_backup` | #133 (design + evidence) | not applied |
| B04 | Google Drive sharing and privacy | N/A (code) / BLOCKED_OWNER (audit) | — | MAOS has no Drive integration (only MIME detection names Google types); it never reads or changes Drive sharing. Delivery to clients goes through MAOS's private bucket with signed downloads. A Drive-side audit of the agency's folders needs the owner's explicit approval to use the Drive connector | Documented 2026-11-02 (acceptance requirement 4). Audit acceptance, if approved: list of client folders with "anyone with the link" sharing, none unexpected | — | NOT VERIFIED (Drive side) |
| B05 | Storage capacity, persistence, monitoring, alerts | DONE (inventory) / monitoring NOT_STARTED | — | Persistence PASS (isolated: bytes identical after API restart; production bucket private, versioning off). Inventory 2026-11-02 (read-only, credentials in-process via `railway run`, script `bucket-inventory.mjs` kept in the session scratchpad): **0 objects, 0 bytes**; database: `FileAsset` 2 rows (metadata only: no mime type, no size, `versionCount` 0, created 2026-10-24), `FileVersion` 0 → consistent, no orphans, no dangling references. Capacity: Railway buckets are usage-billed, no quota to hit at 0 bytes. Monitoring: none for storage yet; add a nightly object-count/size line to the backup report once uploads exist (needs the read-only inventory to run where credentials already are, i.e. inside the API as an OWNER-only health detail, not on the Mac) | Inventory recorded in PROGRESS (done). Monitoring acceptance: nightly line + alert when usage grows > 20 % in a day | — | inventory PASS (0/0); alerts not built |

## C — Files, Videos & Attachments (P1)

| ID | Task | Status | Deps | Notes / implementation | Tests & acceptance | PR / commit | Production |
|---|---|---|---|---|---|---|---|
| C01 | Configurable file upload limits | PARTIAL | — | Already configurable: `FILE_MAX_UPLOAD_BYTES` (default 25 MiB, hard ceiling 100 MiB in `storage.config.ts`). Production has it unset → 25 MiB. Remaining: decide the production value (owner env change on `jihad`), confirm the web proxy/Railway edge accepts that body size, and show the limit in the upload UI before the user picks a file | Upload of (limit − 1 byte) accepted, (limit + 1) refused with a clear message, on the isolated stack with the chosen value | — | 25 MiB in production |
| C02 | Large video upload, playback, download, persistence | DONE_ISOLATED (≤ 25 MiB) | C01 | 2026-11-02: real MP4 201, fake `.mp4` 400 (content sniffing), 28.6 MB refused, playback and download in the client portal, bytes identical after restart. Above 25 MiB NOT VERIFIED until C01 | Repeat with the C01 value, including a > 100 MB refusal | #130 | NOT VERIFIED above 25 MiB |
| C03 | Supported formats review (PDF, images, Office, ZIP, video, links) | DONE (review) / test PR awaiting merge | — | Reviewed 2026-11-02 (table in PROGRESS and PR #135): 15 extensions, each verified by magic bytes or NUL-free text, server-decided content type, inline only for images/PDF/video; ZIP never extracted, never inline; `.url` links wrapped by the web and shown as a link in the portal; SVG/HTML/JS/EXE refused. Gap for owner decision O12: legacy `.doc/.xls/.ppt` not accepted (one allow-list row with the OLE signature if wanted) | `file-formats-matrix` 60/60 (in CI unit gate) | #135 (draft, tests only) | no behaviour change |
| C04 | Safer client delivery and employee-identity protection | DONE (V2) / further NOT_STARTED | — | Delivered: client sees company identity only, internal notes invisible, staff names stripped from client payloads (#129–#131). Further work only when a concrete gap is found | `security-gate-client-complaints`, client-portal privacy tests | #129–#131 | deployed `de2ee1b` |

## D — Client Portal & Notifications (P1)

| ID | Task | Status | Deps | Notes / implementation | Tests & acceptance | PR / commit | Production |
|---|---|---|---|---|---|---|---|
| D01 | E-mail notifications for deliveries and filming appointments | NOT_STARTED | B02 | Mail module (Resend, HTTPS) and `EmailMessage`/`EmailEvent` tracking exist; invoices already e-mail. In-app notices never reach an offline client (documented 2026-11-02). Build behind a per-tenant switch, default off; sending to real clients is an owner authorization | Isolated: delivery created → one e-mail per active client membership of that scope, logged in `EmailMessage`; switch off → none | — | — |
| D02 | Client messages and new-work requests | DONE (awaiting merge) | — | Problem reports (#131) cover complaints. New-work requests delivered 2026-11-02 as draft PR #136: `ComplaintsService` kind-parameterised, `WorkRequestsService` (`resourceType 'request'`, audit `WorkRequest`), routes `/client/requests` and `/requests`, generic chat excludes both kinds; web `/client/requests` (+ detail) and `/requests`, notification links, "Work requests" nav entry. Not yet linked from the client dashboard (small follow-up when merged) | `security-gate-client-work-requests` 10/10 (in CI), complaints gate 10/10 together, web 291/291, API + web typecheck clean | #136 (draft) | not deployed |
| D03 | Client review deadlines and reminders | NOT_STARTED | — | Appointment reminders already run on the scheduler; add a review-by date on deliveries (needs a column → migration gate) or derive from project deadline (no migration) — decide at start | Reminder once, 24 h before, to the client scope; never to staff identities | — | — |
| D04 | Side-by-side version comparison | NOT_STARTED | — | `FileVersion` exists; UI compares two versions (images/PDF side by side, metadata for others) | Two versions render side by side; client sees only client-visible versions | — | — |
| D05 | Multi-file delivery and communication without a new upload | NOT_STARTED | — | Delivery = `ApprovalRequest` on one file (#128). Allow a delivery to reference several existing files and a message-only delivery | Client sees one delivery with N files; approving covers all | — | — |

Preserve (regression-guarded in CI): deliveries and approvals, revision requests, complaints to management, filming appointments, partial-payment visibility, staff identity protection, customer isolation.

## E — Team & Access Management (P1)

| ID | Task | Status | Deps | Notes / implementation | Tests & acceptance | PR / commit | Production |
|---|---|---|---|---|---|---|---|
| E01 | One Team & Access experience (Members, Invitations, Company Access, User Requests) | DONE (awaiting merge) | — | Delivered 2026-11-03 as draft PR #137: `/team` with tabs Members & access (`/team/members`), Invitations (`/team/invitations`), User requests (`/team/requests`); the three page components moved unchanged to `src/components/team/`; old routes `/dashboard/admin/{company-access,invites,users/requests}` redirect (e-mail review link kept); one OWNER-only "Team & Access" nav entry replaces three; no API or permission change | `test/team-access.test.mjs` 10/10; six suites updated for the moved files; web typecheck + `next build` + 301/301 green; CI SUCCESS (API, web, audit) | #137 (draft) | not deployed |
| E02 | Permission and membership audit history | PARTIAL | — | `AuditEvent` records membership/permission changes; no UI. Add a history panel per member (OWNER) | History shows role changes and grant changes with actor and time; CLIENT never sees it | — | — |
| E03 | Review temporary "Sees all tasks" permission | READY | — | Per-company grants (#124); check expiry/revocation and that a role change drops it (#126 fixed stale grants) | Grant → role change → grant gone; test exists or is added | #124, #126 | — |
| E04 | Invitations and memberships across companies | DONE | — | #112 switcher, #114 existing-account invites, company-access-isolation suite in CI | CI suites | #112, #114 | deployed; real-user acceptance NOT VERIFIED (A02) |
| E05 | Old removed test accounts review | READY | — | Read-only review of production users with test-looking domains or REMOVED status; report only, no deletion | Report in PROGRESS; zero writes | — | — |

## F — UX & Reliability (P1)

| ID | Task | Status | Deps | Notes / implementation | Tests & acceptance | PR / commit | Production |
|---|---|---|---|---|---|---|---|
| F01 | Invoice table responsiveness on mobile | DONE (awaiting merge) | — | Delivered 2026-11-03 as draft PR #138: `/finance/invoices` renders one card per invoice under `md` (number link, badge, project, total, due) and the unchanged table from `md` up; long numbers wrap, project names truncate; detail line-item table scrolls in its own `overflow-x-auto` box; `/client/invoices` already a wrapping card list (pinned) | `test/invoice-table-mobile.test.mjs` 5/5; web typecheck + `next build` + 296/296 green; CI SUCCESS; live 375 px browser check NOT done (needs authenticated workspace with invoices) | #138 (draft) | not deployed |
| F02 | Generic error and access-denied messages | DONE (awaiting merge) | — | Delivered 2026-11-03 as draft PR #139: `src/lib/api-errors.ts` maps every failed request to a sentence (401/403 fixed wording kept; 400/404/409/410/413/415/422/429 one sentence each; 5xx and no-response generic); API sentences for people pass through, codes (`own_entries_only`, `INVALID_STATUS`), framework defaults, `HTTP 404`, stack/DB text replaced; all three transports in `fetch.ts` use it; pages unchanged | `test/plain-language-errors.test.mjs` 10/10; web typecheck + `next build` + 301/301 green | #139 (draft) | not deployed |
| F03 | Intermittent deadline-reminder test | IN_PROGRESS | — | Failed once in a 44-file batch on 2026-11-02, passed 3/3 alone and in a second batch; earlier CI-3/CI-4 showed similar shared-DB timing. Reproduce under parallel load; fix the test's isolation (own tenant, own clock) | 20 consecutive parallel runs clean | — | — |

## G — Platform & Internal Operations (P2)

| ID | Task | Status | Deps | Notes | Acceptance | PR | Production |
|---|---|---|---|---|---|---|---|
| G01 | Review PR #120 (custom board lists, migration A) | BLOCKED_OWNER | migration gate | Open PR with a schema change; review for safety, then owner migration window | Gate report per `docs/migrations` pattern | #120 | — |
| G02 | Review PR #109 (F-6 rate/cost module) and #110 (UX audit docs) | BLOCKED_OWNER | — | Both open since October; #109 is a no-behaviour refactor, #110 docs. Owner merge decision | Rebased on main, CI green, then owner merge | #109, #110 | — |
| G03 | Engineering release ledger | DONE (ongoing) | — | This file + PROGRESS + RESUME; ledger capsule points here | Updated at every task boundary | — | — |
| G04 | Graphify integration and dependency-map freshness | READY | — | `graphify-out/` exists untracked in the main checkout (another session); refresh after each merged PR with `graphify update .` | Graph updated at `de2ee1b` | — | — |
| G05 | Remaining gaps to replace Trello, ClickUp and Notion | NOT_STARTED | — | Analysis only | Gap list with task IDs | — | — |
| G06 | Keep the accounting modernisation assessment aligned with K | NOT_STARTED | K | `docs/finance` | — | — | — |

## H — Product Name & Branding (P2)

| ID | Task | Status | Notes |
|---|---|---|---|
| H01 | Research independent commercial product names | NOT_STARTED | Phase 7 |
| H02 | Preliminary domain and trademark availability | NOT_STARTED | No purchases |
| H03 | Branding and logo proposals | NOT_STARTED | — |
| H04 | Apply the owner-approved brand | BLOCKED_OWNER | Owner approval required |

## I — Soldado Marketing Website (separate project)

| ID | Task | Status | Notes |
|---|---|---|---|
| I01–I04 | Inspect assets, UI/UX, build, test and release | NOT_STARTED | Separate repository; never mixed into MAOS PRs |

## J — Multi-Company Management (P0)

| ID | Task | Status | Deps | Notes / implementation | Tests & acceptance | PR / commit | Production |
|---|---|---|---|---|---|---|---|
| J01 | Company profiles and settings | PARTIAL | — | `Tenant` has name/slug; verify which settings exist (branding, sender name, defaults) and what the owner needs per company | Settings page per company, OWNER only | — | — |
| J02 | Secure company switching | DONE | — | #112: switcher, owner-controlled switching rights, session re-issued per tenant | `company-access-isolation` suite in CI | #112 `4693250` | deployed |
| J03 | Complete tenant isolation (finance, projects, files, customers, banking, notifications) | DONE (continuous) | — | Gates 1–3, `TenantContextModule`, tenant-scoped repositories, security suites in CI (`CROSS_CLIENT_LEAKS = 0`) | Every new module adds to the isolation suites | many | deployed |
| J04 | Different roles for the same user in different companies | DONE | — | `TenantMembership` per tenant; #112, #114, #124 | CI suites | #112, #114, #124 | deployed |
| J05 | Owner Control Center across companies | DONE | — | #123 | web tests | #123 | deployed |
| J06 | Verification pass: switching, session context, authorization, caching, direct API access | DONE_ISOLATED | J02–J05 | 2026-11-02: 32 probes on the isolated stack with three fictional companies (PROGRESS). Switching, session revocation, refresh-token revocation, per-id 404s across companies, clean lists, header forgery ignored, role-per-company enforcement: all PASS. One gap → J07 | Probe matrix PASS; gap recorded as J07 | — | production NOT VERIFIED (same code; probes are isolated) |
| J07 | `Cache-Control: no-store` on every `/api` response | DONE (awaiting merge) | J06 | Global `NoStoreMiddleware` (`apps/api/src/common/http/no-store.ts`, registered in `AppModule` next to the request id) sets the header before any handler; file streams, PDFs and CSV exports keep their explicit `private, no-store`; handlers may override. Draft PR until release approval | Unit `no-store-cache` 6/6 (in CI gate), unit gate 407/407, integration-api 39/39 (header on liveness, 401, 404, authenticated list), build OK | #134 (draft) | not deployed |

## K — MAOS Finance: full accounting (P1, Phase 4)

| ID | Task | Status | Notes |
|---|---|---|---|
| K01 | Double-entry, journals, SKR03/SKR04 | NOT_STARTED | Requires ADR + schema (migration gated); fictional data only |
| K02 | Customer invoices, supplier bills, credit notes, partial payments | PARTIAL | Invoices, payments (partial, idempotent), revenue and cost records exist; supplier bills and credit notes do not |
| K03 | Bank accounts and transactions | NOT_STARTED | — |
| K04 | Expenses, income, VAT records | PARTIAL | `CostRecord`, `RevenueRecord`; no VAT model (D6 open) |
| K05 | P&L, balance sheet, BWA, reporting | NOT_STARTED | Profitability per project/customer exists (T74/T75) |
| K06 | DATEV-compatible export | NOT_STARTED | Spec verification first |
| K07 | Separate company ledgers and financial permissions | PARTIAL | Tenant isolation + OWNER-only FINANCE; ledger separation follows K01 |
| K08 | Open Banking connectivity (read-only first) | BLOCKED_OWNER | Provider choice, contract, real bank consent |
| K09 | Bank reconciliation and payment matching | NOT_STARTED | After K03/K08 |
| K10 | Multiple bank accounts per company | NOT_STARTED | After K03 |

## L — MAOS AI Assistant (P1, Phase 5)

| ID | Task | Status | Notes |
|---|---|---|---|
| L01–L07 | Assistant, task/project help, financial insights, multi-company awareness, controlled actions, role capabilities, authorized search | NOT_STARTED | No AI provider dependency exists in the code today (voice-to-task is schema-only). Provider, cost and data-handling need an owner decision before any dependency is added; design must inherit the caller's permissions and log sensitive actions |

## M — Sidebar & Navigation (P1)

| ID | Task | Status | Deps | Notes / implementation | Tests & acceptance | PR / commit | Production |
|---|---|---|---|---|---|---|---|
| M01 | Audit menu structure and role visibility | READY | — | Today four groups in `sidebar.tsx`: Workspace, Delivery, Team, Operations (Operations holds files, approvals, complaints, voice, finance, invoices, reports, audit, data, settings). Role visibility comes from `navigation.ts` `allowedRoles` | Audit table: item → group today → target group → roles | — | — |
| M02 | Reorganise into Workspace · Company & Team · Projects & Delivery · Customers & CRM · Finance & Banking · AI Assistant · Reports · Settings | READY | M01 | Group-only change in `sidebar.tsx`; routes and `allowedRoles` untouched; ops-dashboard test requires every nav id to have a slot; AI Assistant group appears only when L ships | Web tests: every id has a slot, no duplicates, CLIENT sees none of it | — | — |
| M03 | Icons, spacing, grouping, active states, collapsible navigation | READY | M02 | Mobile nav already compact (#119) | Visual check 375/768/1440 | — | — |
| M04 | Verify desktop, tablet and mobile navigation | READY | M03 | agent-browser at three widths | No overflow, every group reachable | — | — |
