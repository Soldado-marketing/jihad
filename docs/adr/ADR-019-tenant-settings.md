# ADR-019: TenantSettings — per-company configuration (J01)

Status: Proposed (owner decision O24; schema-gated)

## Status

Proposed on 2026-11-03 for the master plan row J01. Nothing is implemented; no migration exists.

## Context

`Tenant` holds only `name`, `slug` and `status`. The web `/settings` page is a read-only profile and workspace display (Blueprint §22 CURRENT). Everything the owner needs per company — branding and sender name, locale, currency and timezone, working days, task and project defaults, cost rules, and now the accounting master data that K06 (DATEV export) requires — has no storage. Blueprint §22 names the target: a canonical `TenantSettings` model, added by an explicit architecture and migration decision, without converting status enums into tables.

## Decision options

1. **One `TenantSettings` row per tenant (1:1), typed columns for the settled groups and one `Json` column per open group.** Small, indexable, typed where the application reads values in code paths that must not break (currency, timezone, account length).
2. Key–value table `TenantSetting(tenantId, key, value Json)`. Flexible, but every reader validates shape; no database-level typing; easy to misuse as a second configuration system.
3. Columns on `Tenant` itself. Simplest, but `Tenant` is loaded on every request and would grow with rarely-read data.

## Decision (proposed)

Option 1.

```prisma
model TenantSettings {
  tenantId                 String   @id
  tenant                   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // organization & branding
  legalName                String?
  senderName               String?          // name shown to clients in mail and notices; default Tenant.name
  logoFileAssetId          String?          // a FileAsset of this tenant (validated in the service)
  // locale
  locale                   String   @default("de-DE")
  currency                 String   @default("EUR")
  timezone                 String   @default("Europe/Berlin")
  workingDays              Json?            // e.g. ["MON","TUE","WED","THU","FRI"]
  workingHours             Json?            // { "start": "09:00", "end": "17:00" }
  // defaults
  taskDefaults             Json?            // priority, due offset …
  projectDefaults          Json?
  // cost rules (cents; Owner-only read)
  defaultInternalRateCents    Int?
  defaultContractorRateCents  Int?
  minContributionMarginPct    Decimal? @db.Decimal(5, 2)
  // accounting master data (K06; Owner-only read)
  datevConsultantNumber    Int?             // 1001–9999999
  datevClientNumber        Int?             // 1–99999
  fiscalYearStart          DateTime?        // first day of the fiscal year
  accountNumberLength      Int?             // 4–8
  chartOfAccounts          String?          // "SKR03" | "SKR04"
  debtorNumberStart        Int?             // first debtor account per customer, if used
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
}
```

- Read access: OWNER and MANAGER read the organization, locale and defaults groups; **cost rules and accounting master data are OWNER-only** (sensitive FINANCE/TENANT read); CLIENT never reads settings.
- Write access: OWNER only; every change audited (`tenant.settings_updated` with the changed keys, never the values of cost rules in the payload).
- Defaults when the row is missing: the service returns the defaults above, so the migration needs no backfill.
- Validation in the DTO: ISO codes, IANA timezone, DATEV ranges from `docs/finance/MAOS_DATEV_EXPORT_SPEC_K06.md`.

## Migration

Additive: one table, no change to existing rows. Rollback: `DROP TABLE "TenantSettings"` loses only settings (re-enterable). Apply only in an owner migration window after a fresh verified backup, like #120.

## Consequences

- J01 settings page per company, OWNER-only, becomes a plain CRUD over this row.
- K06 (DATEV) and later K01 read their master data here instead of from code or environment variables.
- Notification preferences, integrations and service templates stay separate models (§22), not folded into this row.

## Open questions for the owner (O24)

1. Approve this ADR and a migration task for `TenantSettings`.
2. Which groups matter first (branding and sender name? accounting master data for K06?).
3. Should MANAGER read the locale/defaults groups, or OWNER only?
