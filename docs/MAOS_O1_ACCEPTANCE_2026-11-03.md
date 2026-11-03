# MAOS O1 — Acceptance walk-through of release `e301574` (isolated stack, fictional data)

**Date:** 2026-11-03. **Code:** `main` `e301574` (release train #147) built locally. **Stack:** PostgreSQL 18 container, MinIO (S3-compatible) container, API `node dist/main.js` on :3001 with the scheduler on, web `next dev` on :3000, Claude's built-in browser at 1024×768 and 375×812. **Data:** two fictional companies ("Nord Agentur", "Süd Studio"), users Dana (OWNER in Nord, MANAGER in Süd), Malik (MANAGER), Lina (EMPLOYEE), Omar (CLIENT, scope X), Yara (CLIENT, scope Y), Bilal (OWNER B), Client B (scope key `x-k` in Süd — same key as Omar, other company). No production account, no real data, everything removed afterwards.

**Why not production:** this session holds no authorized production session or approved test access, and production test accounts need approval (O2). Every row below is therefore **PASS on the isolated stack**; the production column stays NOT VERIFIED until the owner walks through with a real account or approves fictional production accounts.

| # | Workflow | Role | Result | Evidence |
|---|---|---|---|---|
| 1 | Login with e-mail + password, redirect to dashboard | OWNER | PASS | `/auth/login` → `/dashboard`, "Nord Agentur · Owner" |
| 2 | Dashboard numbers | OWNER | PASS | Outstanding 1,523.00 = (1,428 − 500) + 595; invoiced 2,023; paid 500; 3 open tasks |
| 3 | Sidebar groups (M02) and OWNER-only entries | OWNER | PASS | Workspace · Company & Team (Team & Access, Audit Log) · Projects & Delivery · … · Finance & Banking · Reports · Settings |
| 4 | Team & Access tabs (E01) | OWNER | PASS | `/team/members` with Members & access / Invitations / User requests; five members listed with roles and grants |
| 5 | Explicit grants (E-grants) | OWNER | PASS | "Views invoices" on for Malik, "Sees all tasks" on for Lina; both audited |
| 6 | Member History (E02) | OWNER | PASS | Lina → History: "Permission changed · Sees all tasks: on · by Dana Owner · 03/11/2026, 13:58:31" |
| 7 | Audit log | OWNER | PASS | newest first: two file-version uploads, two permission changes |
| 8 | File versions (upload v1, v2) | OWNER | PASS | API multipart upload to MinIO, versions 2 ACTIVE / 1 SUPERSEDED |
| 9 | Compare versions (D04) | OWNER | PASS | two PDF panes side by side, "Right is 48 B larger than left"; on 375 px the panes stack (293 px wide, no horizontal scroll) |
| 10 | Send delivery with review-by (D03) | OWNER | PASS | "Version 2 is with the client for review. Review due 4 Nov 2026, 10:00 (within 24 hours)"; file becomes client-visible |
| 11 | Reminder job (D03) | system | PASS | `client-review-reminders` run once: 1 notification to Omar only ("please review by Wed 4 Nov, 10:00"); nothing to staff or Yara |
| 12 | Company switching (J02/J04) | OWNER→MANAGER | PASS | switch to Süd Studio: "Süd Studio · Manager", Süd data only (1 project, 1 task, Files 0), no owner entries; switch back |
| 13 | Invoice list on a phone (F01) | OWNER | PASS | 375 px: 2 cards, table hidden, scrollWidth 375 |
| 14 | Dashboard and Team page on a phone | OWNER | PASS | bottom navigation, no horizontal scroll, three tabs |
| 15 | Client portal overview incl. D02 entry | CLIENT | PASS | menu "Requests" + "Request new work" link; "Waiting for you": delivery + invoice; 2 unread notices |
| 16 | Client delivery review (D03 text, preview, decision) | CLIENT | PASS | "Review due … (within 24 hours)" in amber, PDF preview, "Request revision" with note → "In revision", review line calms to "Review was asked for by …"; employee notified "Client requested changes" |
| 17 | Client creates a work request (D02) | CLIENT | PASS | form → "Sent to management"; manager sees it under Work requests "Needs an answer" |
| 18 | Client invoice detail | CLIENT | PASS | total 1,428 / paid 500 / open 928, payment list, PDF download link |
| 19 | Client portal on a phone | CLIENT | PASS | 375 px, no horizontal scroll |
| 20 | Client isolation (API) | CLIENT X/Y/B | PASS 17/17 | Yara: X's delivery 404, X's file 403, own invoice only; Client B (same scope key, other company): nothing from Nord; Omar: undelivered version 1 → 403, staff routes 403 |
| 21 | Employee scope | EMPLOYEE | PASS | with "Sees all tasks": 3 tasks on the board; Finance page → "You do not have permission to view this page" (F02 wording); no Team/Audit/Finance in the menu; API: invoices/audit/members/member-history 403 |
| 22 | Manager scope | MANAGER | PASS | invoices visible through the grant; Work requests page; Team & Access → "Access denied"; API: audit and member history 403 |
| 23 | Audit trail of the delivery | system | PASS | `delivery.submitted`, `delivery.changes_requested` |
| 24 | Old admin routes | — | PASS (prod) | `/dashboard/admin/*` answer with a client-side redirect to `/team/*` |

**Finding (fixed):** the client "Request new work" page carried the problem-report wording ("Something went wrong…", "What happened?"). Fixed in PR #148 (web only; tests 349/349; wording pinned by a test). Not yet released.

**Not verified anywhere:** e-mail delivery (no mail provider in the isolated stack; production mail untouched), file uploads through the browser's file picker (uploaded through the API instead), the compact mobile menu contents on a phone beyond the bottom bar, invitations and user-request approval flows (unchanged by this release; covered by CI suites).
