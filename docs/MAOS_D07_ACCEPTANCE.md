# D07 — acceptance checklist and evidence matrix

**Task (master task list, row D07):** Delivery history and communication history per customer. Deps: —. Notes: Customer 360 tab: deliveries, decisions, requests, problems, invoices, appointments in one timeline (reads existing rows). Acceptance: timeline shows every round and request for a customer; CLIENT never sees internal notes.

**Closure status (2026-11-10):** IN PROGRESS. Checklist and audit written before any change; nothing is built yet.

Written before implementation (owner's rules of 2026-11-04: checklist from the original specification first, one task at a time, independent comparison before closure; functional tests, never page-load checks). Status values: PASS (test or measurement named) · OPEN · BLOCKED — OWNER.

## Blueprint §30 validation (2026-11-10)

Consistent with the Blueprint: Customer 360 is an approved TARGET workspace (§43.2: "…approvals, requests, … invoices, payments, … meetings, timeline", owner "Customer + all linked domains", no schema beyond Customer). No duplicate system: the per-record activity timeline (`GET /activity/:type/:id`, AuditEvent) stays what it is; D07 is a business history read from the domain rows themselves. No schema or migration (reads existing rows). Authorisation: no new permission; it reuses CUSTOMER read plus each source's existing rule. Tenant and client scope: every query is company-scoped and customer-scoped; the suite asserts it. Finance: amounts only for the OWNER (§6). Production and Railway: a release of API and web, the owner's decision at the end. No new integration, no files outside the MAOS root, next task in order after C08. `BLUEPRINT_CONFLICT: NO`.

## Audit before coding (2026-11-10, main `82bc4e9`)

| Area | Finding |
|---|---|
| Customer 360 today | `GET /api/customers/:id/overview` (`CustomerOverviewService`, MAOS-T54): bounded lists and counts for projects, tasks, files, approvals, invoices and, for the OWNER, finance. Each section appears only when the caller may read that resource; a contractor keeps their work scope; money only for the OWNER. No history: closed delivery rounds, decisions, requests, problem reports and appointments are not shown. |
| Web | `/customers/[id]` has the tabs Overview, Projects, Files, Notes (`src/lib/customer-360.ts`). |
| Deliveries and decisions | A delivery is a client-visible `ApprovalRequest` for one file version; each round has its `ApprovalDecision` rows (APPROVE, REQUEST_CHANGES with the client's note, CANCEL carrying the company's reply when a new round is sent). Linked to the customer through the file's `customerId` or the request's `clientScopeKey` (the overview's own rule). Staff see rounds per file only (`DeliveriesService.listForFile`). |
| Requests and problems | Work requests and problem reports are `ChatChannel` rows of kind `request` / `complaint`, keyed by `clientScopeKey`; messages are `ChatMessage` rows, `clientVisible=false` marks an internal management note; opened / resolved / reopened are audit events. **Management only** (`ComplaintsService.requireManagement`: OWNER, MANAGER) — a report is never shown to the employee it may be about. |
| Appointments | Shooting appointments are tasks carrying the "Shooting appointment" label; they belong to the customer through their project. Sales meetings (`Meeting`) are linked to leads and opportunities, not to customers, and stay out (same decision as the overview). |
| Invoices and payments | `Invoice.customerId`; `issuedAt`, `dueAt`, status. Amounts and payments are finance data: OWNER only. |
| Client side | The client portal has its own routes built field by field; none of them is touched. A CLIENT has no CUSTOMER permission, so the customer routes refuse them today. |

## Design (smallest change that meets the row)

- **API:** `GET /api/customers/:id/history?limit=&before=` in the customers module (`CustomerHistoryService`), CUSTOMER read. One merged list, newest first, of typed entries: delivery sent, client decision (approved / changes requested, with the client's note), company resubmission (with its reply), request or problem opened, message (client or company; an internal note is flagged `internal`), resolved / reopened, invoice issued, payment recorded, appointment. Each entry carries what it is, when, a title, a status where one exists, who spoke as `client` or `company` (never a staff name, id or e-mail), and a reference to open the record.
- **Sections follow the caller, as in the overview:** deliveries need APPROVAL read (contractor: assigned files only); appointments need TASK read (contractor: assigned work only); invoices need INVOICE read, amounts and payments only with the sensitive FINANCE permission (OWNER); requests and problems only for OWNER and MANAGER. A section the caller may not read is absent and listed as such, not empty.
- **Paging:** `limit` (default 50, at most 100) and a `before` cursor; no entry is dropped or repeated between pages.
- **Web:** a History tab on `/customers/[id]`: entries grouped by day, a filter per kind, an "Internal note" mark, a link to the record, "Load more".
- **Not in scope:** no new table, no write path, no client-portal change, no e-mail; sales meetings stay out until they are linked to customers.

## Acceptance matrix

| # | Criterion | Evidence | In CI | Status |
|---|---|---|---|---|
| 1 | The timeline shows every delivery round of the customer: sent, the client's decision with its note, the company's resubmission with its reply, in order | `customer-history` integration suite | yes | OPEN |
| 2 | It shows every work request and every problem report of the customer: opened, each message, resolved / reopened | same suite | yes | OPEN |
| 3 | It shows the customer's invoices (issued, status) and appointments (when, status) | same suite | yes | OPEN |
| 4 | Internal notes: visible to OWNER and MANAGER only, flagged as internal; never to an EMPLOYEE or CONTRACTOR (the whole requests/problems section is absent for them) | same suite | yes | OPEN |
| 5 | **A CLIENT never sees internal notes:** the route refuses a CLIENT (403); no client-portal route returns the history; the client's own request and problem views still return no internal note | same suite + existing `security-gate-client-complaints` | yes | OPEN |
| 6 | Money: amounts and payments only for the OWNER; a MANAGER with invoice access sees invoices without amounts | same suite | yes | OPEN |
| 7 | Scope: another customer's rows never appear; another company's customer id is 404; a contractor granted customer access sees only deliveries and appointments of assigned work; a default CONTRACTOR is refused | same suite | yes | OPEN |
| 8 | No staff identity in any entry: no user id, name or e-mail; the speaker is `client` or `company` | same suite (payload scan) | yes | OPEN |
| 9 | Paging: walking the pages with `before` returns every entry exactly once, newest first, also when entries share a timestamp; `limit` bounded | unit test of the merge + same suite | yes | OPEN |
| 10 | Bad input: unknown `limit` / `before` values answer 400; `Cache-Control: no-store` | same suite | yes | OPEN |
| 11 | Web: History tab lists the entries grouped by day, filter per kind, internal mark, link to the record, "Load more"; empty and error states; the tab is absent when the API offers no section | web unit tests + browser smoke case | yes | OPEN |
| 12 | Web on a phone-width screen: the timeline is readable without sideways scrolling | browser smoke (mobile project) | yes | OPEN |
| 13 | No schema change, no migration, no write path; client-portal routes untouched | diff of the branch | — | OPEN |
| 14 | Regression: `customer-overview`, `customers`, `security-gate-client-complaints`, deliveries and appointments suites, full `npm test`, web tests, typecheck and build of both apps | local run | yes | OPEN |
| 15 | CI: six jobs green on the code head | CI run | yes | OPEN |
| 16 | Graphify refreshed; dependents of changed symbols reviewed | `graphify update .` | — | OPEN |
| 17 | Security review of the diff: company and customer filters on every query, no key, token or secret, no raw message body beyond a bounded excerpt | review | — | OPEN |
| 18 | Merge, deploy (API and web, no migration) and production verification when authorised; a verified backup must exist first (the nightly backup has been failing since 2026-11-08) | release record | — | BLOCKED — OWNER |

## Run record

To be filled from the final local run and the CI run on the code head.
