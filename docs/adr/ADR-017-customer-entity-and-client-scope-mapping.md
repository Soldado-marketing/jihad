# ADR-017: Customer Entity And Client-Scope Mapping

Status: Accepted

## Status

Accepted by the owner on 2026-10-11 (proposed in MAOS-T49). Accepting it is an owner decision (OWNER_GATE_PRODUCT_BEHAVIOR). The schema (T50) and the backfill (T51) it describes are separate tasks, each behind the migration gate. Nothing in this ADR changes the database or the API.

## Context

Verified on `main` (2026-10-11):

| Fact | Evidence |
|---|---|
| There is no Customer entity. Client identity is the string `clientScopeKey`. | `apps/api/prisma/schema.prisma`: no `Customer` model. `clientScopeKey` is on 13 models: TenantMembership, Project, Task, FileAsset, FileShare, ApprovalRequest, ChatChannel, ChatMembership, ChatMessage, VoiceNote, Invoice, Payment, RevenueRecord. |
| `clientScopeKey` is the client authorization boundary. | `ClientScopeService.resolve` reads the key from the caller's ACTIVE membership only and fails closed for a CLIENT without one. Every portal query filters on it (Gate 3). |
| Keys are now assigned deliberately. | F-1: approving or changing a member to CLIENT requires a key (1–120 of `A-Za-z0-9._-`). Internal roles carry none. |
| Isolation is proven by tests. | `security-gate-client-isolation` (list and direct-ID matrix, A vs B), `client-onboarding-scope`, `security-gate-foreign-ids*`, and the full suites are blocking in CI (T39). |
| The Blueprint fixes the direction. | §10: one canonical Customer as the business anchor. §4/§10 rule: `clientScopeKey` keeps protecting the portal and must never be dropped, renamed or bypassed as a side effect of Customer work. |

What is missing for the product: a place for the customer's name, contacts, industry, services, contract value, status and responsible person, and a single id that projects, invoices, files and reports can point at (Customer 360, profitability per customer).

## Decision Options

| Option | Summary | Isolation risk | Migration size |
|---|---|---|---|
| A. Customer table that **owns** the key | `Customer(tenantId, clientScopeKey unique per tenant, profile fields)`. Records gain a nullable `customerId`. The portal keeps filtering on `clientScopeKey`. | None during rollout: the boundary is unchanged. | Small, additive. |
| B. Replace the key with `customerId` | Move the portal filter to `customerId` and drop `clientScopeKey`. | High: every portal query and isolation test changes at once. | Large, destructive. |
| C. Keep strings only | Add profile fields somewhere keyed by the string. | None. | Small, but no real entity, no FKs and no referential integrity. |

## Decision (proposed)

**Option A.** The Customer is the business entity; `clientScopeKey` stays the authorization boundary.

1. **Schema (T50, migration-gated).**
   - `Customer`: `id`, `tenantId`, `clientScopeKey` (`@@unique([tenantId, clientScopeKey])`), `name`, `status` (ACTIVE / INACTIVE / ARCHIVED), optional profile fields from Blueprint §10, `responsibleUserId?`, timestamps.
   - Nullable `customerId` (FK, `onDelete: Restrict`) on **Project, Invoice and FileAsset** only, in the first step. The other key-carrying tables follow when a feature needs them.
   - No column is dropped or renamed.
2. **Backfill (T51, migration-gated, dry run first).**
   - For each tenant, every distinct non-null `clientScopeKey` (from all 13 tables) becomes exactly one Customer, named after the key until an owner renames it.
   - Rows on Project, Invoice and FileAsset with that key get the `customerId`.
   - The script is idempotent: a re-run creates nothing. A dry run prints counts per tenant and changes nothing.
3. **Invariant during the compatibility period.** For any row with both values, `customer.clientScopeKey == row.clientScopeKey`. The API enforces it on every write that sets either value. A record cannot point at a Customer of another client.
4. **API (T52).**
   - A new `CUSTOMER` PermissionResource, added deliberately to each role policy: OWNER/MANAGER write, EMPLOYEE read, CONTRACTOR none by default, CLIENT read of its own Customer only through the portal scope.
   - The Customer's `clientScopeKey` is **immutable** after creation. Changing who a client is remains a membership change (F-1 path), never an edit of the key.
5. **Boundary change (out of scope).** Moving the portal filter from the key to `customerId` would need its own ADR and migration approval. It is not planned.

## Isolation test plan

- The existing isolation suites must stay green, unchanged, before and after T50/T51.
- New for T52: Client A can never read Client B's Customer (list and direct ID), and other tenants' ids answer 404.
- New for T52: writing a `customerId` whose key differs from the record's `clientScopeKey` is refused.
- New for T52: a CONTRACTOR without a grant cannot list customers.
- T51: the dry-run counts equal the number of distinct keys per tenant; a second run creates 0 rows; isolation suites green after the run.

## Consequences

- Customer 360, customer profitability and the customer list (T53–T55, T75) get a real anchor without touching portal security.
- Two identifiers coexist during the compatibility period. The invariant and its tests keep them consistent.
- The backfill names Customers after their keys; an owner must rename them, which is a visible product step.

## Open questions for the owner

1. Which profile fields are required at creation (Blueprint §10 lists many)? Proposed: name only.
2. May an EMPLOYEE see the customer list by default (proposed: read yes, write no)?
3. Should a CLIENT see its own Customer profile in the portal (proposed: name and responsible contact only)?
4. Who may archive a Customer that still has open invoices (proposed: OWNER only, with a warning)?
