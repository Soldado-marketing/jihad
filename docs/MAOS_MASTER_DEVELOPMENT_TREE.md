# MAOS — Master Development Tree and Roadmap v2 (2026-11-03)

Source of truth for rows and statuses: `docs/MAOS_MASTER_TASK_LIST.md` (154 rows, departments A–H, J–R; I = website, out of scope). This file holds the dependency tree, the phases with exit criteria, the per-workstream acceptance, and the consolidated owner decisions. Verified against `main` `3baaad7` (live on Railway `jihad` + `maos-web`, 16 migrations, 48 Prisma models, 50 API modules, 50 workspace routes, 17 client routes, 4 scheduler jobs, ~1,100 API and ~370 web test cases).

## 1. Verified current state (Phase 0 audit)

| Class | Rows | What it means |
|---|---|---|
| Exists and works, verified in production (fictional accounts, API level) | A01, D02, D03, D04, E01, E02, E04, F01, F02, G01, G02, J02–J05, J07, M02 | 53/53 production checks 2026-11-03; browser UI verified on an isolated stack of the same commit |
| Exists, verified in isolation only | A02, A03, B05 (inventory), C02, C04, J06, M03, M04 | isolated stacks / rehearsals; production use not exercised |
| Exists but incomplete | C01 (limit value), J01 (settings), K02/K04/K07 (operational finance only), K06 (spec only), N01, P03 | code present, requirement not met |
| Documented only | A04, C03, E03, F03, G03–G06, H01, H02, M01, K06 spec, ADR-019/020 | docs, tests or tooling, no product behaviour |
| Not started | D01, D05, K01, K03, K05, K09, K10, L01, L03–L10, all new rows marked NOT STARTED | — |
| Blocked by owner authorization | B01–B04, E05, H03, H04, K08, L02, P06, Q06, R02, A05, B07 | see decisions O3–O49 |
| Missing from the old backlog (now rows) | A05–A09, B06–B10, C05–C08, D06–D08, E06–E08, F04–F07, G07–G20, J08–J11, K11–K14, M05–M12, N01–N08, O01–O05, P01–P06, Q01–Q06, R01–R08 | 87 rows added 2026-11-03 |

Existing platform capabilities not represented as tasks (verified in code and routes): CRM (leads, opportunities, meetings, follow-ups, proposal drafts), time entries and rates, profitability, reports and dashboard widgets, calendar, chat, internal notes, voice notes and voice-to-task drafts (no transcription provider), CSV import/export, global search, My Work, audit log UI, login history/devices/sessions, shooting appointments with reminders, problem reports and work requests, invoice PDF and e-mail, partial payments, labels, nightly backups with restore rehearsal and alerts on the backup Mac.

## 2. Dependency tree (arrows = must come first)

```
B06 ops alerts ──► R04 system-health page ──► R06 audit routine
B06 ──► C07 storage lifecycle ──► Q04 media rights, R05 retention
B01/B02/B04 (owner) · B03 window (O10) · B07 uptime (O37) · B08 scanning · B09 isolation gate · B10 runbooks ◄── A08 rollback drill
J01 TenantSettings (ADR-019, O24) ──► J08 branding · J09 locale · J10 accounting settings ──► K06 DATEV export
                                   ──► R01 automation admin · O01 service catalogue ──► O02 packages ──► O03 tracker, O04 recurring billing ──► O05 entitlements
D01 client e-mail (O8) ──► D06/J11 preferences (O39)
D05 multi-file delivery (ADR-020, O34) ──► Q03 content approval
G07 comments/mentions · G10 bulk · G19 reports · G20 ICS   (no schema)
G11 templates (O41) ──► G12 recurring ──► G13 automations ──► R01
G08 dependencies, G09 saved views, G17 milestones (O41 batch) · G16 knowledge base (O42) · G14/G15 imports ◄── G01 lists (done)
N01 Customer 360 ◄── D07 delivery history · N02 contacts (O43) · N07 contracts (O43) ──► O05
R03 MetricsService ──► N03 client health · P05 workload/profitability · M07 dashboard
P02 contractor invoices (O40) ──► E06 contractor workflow · P01 capacity (O45) ──► E07 workload · P04 availability
K04 VAT ──► K02 supplier bills/credit notes ──► K06 DATEV export ──► K01 ledger/SKR (ADR) ──► K05 reports, K07 ledgers, K11 periods, K12 reversals, K13 retention, K14 currency ──► K03/K08 banking (O) ──► K09 reconciliation ──► K10
L02 provider (O8) + L01 gate ──► L06 search · L03 Q&A · L10 multi-company ──► L09 audit ──► L05 approval layer ──► L04 actions · L07 customer assistance · L08 finance read-only
Q01 content items (O47) ──► Q02 stages ──► Q03, Q04, Q05 ──► Q06 integrations (O48)
M05 tokens ──► M06 navigation (O20) ──► M07 … M12 (progressive) ; M12 primitives ◄── many pages
A09 CI gate ◄── F06 e2e smoke · B09 ; A05 browser acceptance (O36) · A06 a11y · A07 load · A08 drill
```

## 3. Phases, exit criteria, status

| Phase | Scope (rows) | Exit criteria | Status 2026-11-03 |
|---|---|---|---|
| 0 Audit and tree | this file, 154 rows | every row has status + evidence + next action | **done** |
| 1 Security, backups, monitoring, release stability | B01–B10, A08, A09, F07 | off-site backup verified; least-privilege roles live; key rotated; ops alerts in-app; CI gates (isolation, e2e, scanning) required; rollback drill PASS; runbooks | B06/B08/B09/B10/A08/A09 engineering open; B01/B02/B03/B04/B07 owner |
| 2 Settings, client e-mail, delivery, daily gaps | J01, J08–J11, D01, D05, D06, D07, D08, C01, C05, C06, F04, F05, E08 | owner configures a company; clients get e-mail; multi-file and message-only deliveries; four UI states everywhere | all gated or open; first engineering after Phase 1: C05/C06/F04 (no gate) |
| 3 Project management, recurring work, templates, knowledge base | G07–G20, F06 | Trello/ClickUp/Notion minimum set live (G05 §3) | open; G07/G10/G19/G20 need no schema |
| 4 CRM, packages, contracts, operations | N01–N08, O01–O05, P01–P05, E06, E07, R03 | Customer 360 complete; packages tracked; capacity view; MetricsService | open |
| 5 Accounting foundation | K04, K02, K06, K01, K05, K07, K11–K14 | accountant-validated DATEV export of a month; ledger balanced; periods lockable | open; K06 spec done |
| 6 Banking | K03, K08–K10 | read-only bank feed reconciled against payments | owner (K08) |
| 7 AI assistant | L01–L10 | read-only assistant answers only from permitted data; actions only through approvals | owner (O8/L02) |
| 8 Content/social | Q01–Q06 | content calendar to client approval; integrations only if approved | open; Q06 owner |
| 9 UI/UX redesign V2 | M05–M12 | tokens, dark mode, collapsible navigation, primitives on every module | open; M06 needs O20 |
| 10 Full-system acceptance | A05–A07, R04, R06 | browser acceptance on production per role; load assessed; health dashboard | A05 owner (O36) |

Rows may be executed out of phase order when their dependencies are met and no gate applies.

## 4. Acceptance per workstream (summary)

- **A** every role journey PASS on production (API now; browser when O36 allows); regression suites green as CI gates; no NOT VERIFIED marked PASS.
- **B** every alert path proven by fault injection; backups: fresh, checksummed, rehearsed, off-site; least-privilege roles applied in a window; secrets rotated by the owner only.
- **C** uploads to the configured limit with progress and recovery; previews/playback for every supported type; no orphan objects; client copies stripped of identifying metadata (existing).
- **D** every client-visible event reaches the client in-app and by e-mail (after O8) with preferences; deliveries with N files; no staff identity ever.
- **E** one Team & Access surface; grants, roles, history, revocation proven by the security gates; contractor flow end to end.
- **F** four UI states, phone/tablet/desktop, friendly errors, e2e smoke in CI.
- **G** G05 minimum set live; imports with dry-run; templates and recurrence idempotent; automations audited.
- **J** TenantSettings drives branding, locale, sender, accounting master data; isolation gates stay green.
- **K** balanced double-entry ledger with locked periods and reversals; DATEV month export accepted by the accountant; no compliance claim without validation.
- **L** permission equivalence proven by tests before any provider call; no autonomous financial action.
- **M** tokens + dark mode + primitives, page by page, with regression tests.
- **N/O/P/Q/R** each new model lands by ADR + rehearsed migration; each module has isolation tests and a client-safe boundary.

## 5. Consolidated owner decisions (recommended option first)

| # | Decision | Recommendation |
|---|---|---|
| O3 | Off-site backup provider | Backblaze B2 or Hetzner Object Storage, one bucket, one key (B01) |
| O4 | Rotate `RESEND_API_KEY` | do it now in the Resend dashboard + Railway (B02) |
| O10 | Window for least-privilege roles | 30-minute window after a fresh backup (B03) |
| O6 | Production upload limit | 100 MiB (`FILE_MAX_UPLOAD_BYTES`) after C05 |
| O8 | Client e-mail (D01) + AI provider (L02) | approve D01 now with Resend (already used for invoices); AI provider later |
| O20 | Collapsible sidebar groups | yes, inside M06 |
| O22 | `.gitignore` for `graphify-out/` | yes |
| O23 | Read-only production path for E05 | the fictional-account method of O2 can be reused for a report-only run |
| O24 | ADR-019 TenantSettings | approve; first groups: branding + sender, locale, accounting master data |
| O34 | ADR-020 multi-file delivery | approve; 20 files max |
| O35 | Product name | pick one of the three with a variant domain, or a second round |
| O36 | Browser acceptance on production | sign in yourself with a fictional account, or allow a one-time credential entry |
| O37 | Uptime monitor provider | UptimeRobot free tier → owner e-mail |
| O38 | Orphan object deletion | allow after the first report (C07) |
| O39 | NotificationPreference model | approve with D01 |
| O40 | Contractor invoice record | approve with E06/P02 |
| O41 | Project-management schema batch (dependencies, saved views, templates, recurrence, milestones) | approve as one ADR + one migration |
| O42 | Knowledge base documents | approve |
| O43 | Contacts + contracts | approve as one ADR |
| O44 | Service catalogue + packages | approve as one ADR |
| O45 | Capacity fields | approve with P01 |
| O46 | Payroll provider / validation | decide later; no in-house payroll |
| O47 | Content items + media rights | approve when Phase 8 starts |
| O48 | Social integrations | only after platform app reviews; later |
| O49 | Transcription provider | decide with O8 |

## 6. First implementation task

**B06 — Operational alerts to the OWNER** (no gate, no schema): scheduler watchdog + storage capacity check + `GET /health/ops`. Then B08, B09, B10, A08, A09 (Phase 1 engineering), then C05/C06/F04 while Phase 2 gates are decided.
