# ADR-018: Time Entries And Rate Resolution

Status: Proposed

## Status

Proposed (MAOS-T70, 2026-10-11). Accepting it is an owner decision (OWNER_GATE_PRODUCT_BEHAVIOR). The schema it describes (T71, and later T77 for member terms) is behind the migration gate. Nothing in this ADR changes the database or the API.

## Context

Verified on `main` (2026-10-11):

| Fact | Evidence |
|---|---|
| There is no time tracking. | No `TimeEntry` or `Rate` model, module or page (Blueprint §3, §15). |
| Profitability ignores labour. | `finance/profitability.ts`: margin = revenue − recorded costs. `CostRecord` holds manual costs only. |
| Money is integer cents everywhere. | Invoices, payments, revenue, costs; the web converts with `toCents` (F-5). |
| Finance is owner-only by `sensitive: true`. | Every finance route; `PermissionService` denies sensitive requirements to every non-owner. |
| Contractors are scoped to assigned work. | T35 `ResourceScopeService.resolveWorkScope`. |
| The Blueprint fixes the direction. | §15: `TimeEntry` (member, date, customer, project, task, minutes, billable, review/billing status). `Rate` with deterministic resolution, **frozen onto each entry**. Cost = minutes × frozen rate in integer cents. Rates and costs are sensitive (§6). |

## Decision (proposed)

1. **TimeEntry** (T71, migration-gated).
   - Fields: `tenantId`, `userId` (the member who worked), `date` (calendar date), `minutes`, `projectId`, `taskId?`, `customerId?` (after ADR-017), `billable`, `note?`, `status`.
   - `minutes` is an integer from 1 to 1440 per entry.
   - If `taskId` is given, the task must belong to `projectId` and the tenant (the T27 pattern).
   - **Status:** `DRAFT → SUBMITTED → APPROVED → BILLED`, plus `REJECTED` back to `DRAFT`. An APPROVED or BILLED entry cannot be edited, only corrected by a new entry.
2. **Rate resolution** (deterministic, first match wins). Each source is effective-dated with `validFrom` and resolved for the entry's **date**:
   1. a rate set for that member (internal rate, or `ContractorTerms` rate for a contractor, T77);
   2. the default rate for the member's role in this tenant;
   3. the tenant default rate (Settings → cost rules).

   If no source applies, the entry is stored **unrated**: rate and cost are null, and it is shown as "cost unknown" and never counted as 0.
3. **Freezing.** On creation the resolved `rateCents` (per hour), `rateSource` and `currency` are written onto the entry. Later rate changes never alter existing entries. Re-rating is an explicit OWNER action that writes an audit event per changed entry.
4. **Cost.** `costCents = round_half_up(minutes × rateCents / 60)`, an integer computed once per entry and stored. Totals are sums of stored entry costs and never recomputed from current rates.
5. **Sensitivity and permissions.**
   - A new `TIME_ENTRY` PermissionResource is added deliberately to each role policy. Every internal role creates and reads **its own** entries. MANAGER and OWNER read all entries in the tenant. A CONTRACTOR may log time only on projects in their assigned work (T35). CLIENT: none.
   - **Rates and costs** (`rateCents`, `costCents`, `rateSource` and all rate tables) are returned only to OWNER (`sensitive: true`). Everyone else sees minutes, billable and status.
6. **Profitability (T74).** Project cost = recorded costs + Σ stored entry costs (billable and non-billable). Unrated minutes are reported separately, so a margin with unknown labour is marked incomplete rather than overstated.
7. **Currency.** One tenant currency for rates in the first step (EUR). Multi-currency rates need a separate decision.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Compute cost on read from current rates | A rate change would silently rewrite history (the Blueprint forbids this). |
| Store hours as decimals | Floating point on a cost input; minutes as integers are exact. |
| Treat missing rates as 0 | Understates cost and overstates margin without warning. |
| Time fields on Task | The Blueprint names canonical `TimeEntry`; task-local time fields are excluded (§12). |

## Test plan (for T71–T74)

- Minutes bounds; a task outside the project or tenant is refused; another tenant's project returns 404.
- Resolution order with effective dates: a member rate beats the role default, which beats the tenant default. An entry dated before a new rate keeps the old rate.
- Freezing: editing a rate leaves existing entries' `rateCents` and `costCents` unchanged. Owner re-rating writes audit events.
- Rounding: 1 minute at 3,000 cents/h is 50 cents. 7 minutes at 1,999 cents/h is 233 cents (half-up).
- Sensitivity: non-owners never receive rate or cost fields (API response tests per role). A contractor cannot log time outside their assigned work.
- Profitability includes labour from stored costs and reports unrated minutes separately.

## Open questions for the owner

1. Who approves time (proposed: MANAGER or OWNER of the tenant)?
2. Is a weekly submission cycle wanted now, or only per-entry submission (proposed: per entry first)?
3. Should non-billable time count in project cost (proposed: yes, it is real cost)?
4. Tenant default and role default rates: set in Settings by OWNER only (proposed: yes)?
