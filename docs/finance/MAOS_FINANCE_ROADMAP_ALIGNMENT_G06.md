# MAOS G06 — Finance documents aligned with the K roadmap (docs only)

**Task:** G06 "Keep the accounting modernisation assessment aligned with K". **Date:** 2026-11-03. No code.

## What the existing finance documents cover and where K goes further

| Document | Covers | Gap against K01–K10 |
|---|---|---|
| `docs/MAOS_FINANCE_PAYROLL_PHASE_8.md` (Phase 8 spec) | Revenue tracking, invoices and partial payments, wallet, payroll and employee costs, profitability, financial permissions (Owner-only finance, explicit grants) | Operational finance only: **no double-entry ledger, no journal, no chart of accounts (SKR03/SKR04), no VAT model, no supplier bills or credit notes as documents, no bank accounts or transactions, no reconciliation, no DATEV export, no per-company ledger separation** |
| `docs/finance/payment-provider-shortlist.md` | Candidate payment providers for collecting client payments | Collecting payments is not banking: read-only bank connectivity (K08), reconciliation (K09) and multiple accounts (K10) are a separate provider decision |
| `docs/finance/MAOS_DATEV_EXPORT_SPEC_K06.md` (2026-11-03) | DATEV EXTF format, MAOS gaps, implementation plan | Depends on K01 (accounts, journal) and K04 (VAT) |

## Alignment rules (so the documents stay consistent)

1. **Phase 8 stays the operational layer** (what staff and clients do: invoices, payments, costs, payroll, profitability). **K adds the accounting layer underneath it**: every operational record posts to a journal (K01), carries VAT (K04) and maps to accounts; reports (K05) and DATEV (K06) read the journal, never the operational tables directly.
2. **No duplicate finance system** (Blueprint §28): K01 extends `Invoice`, `Payment`, `CostRecord`, `RevenueRecord` with postings; it does not replace them.
3. **Every K row that adds a table is schema-gated**: K01, K02 (supplier bills, credit notes), K03, K04, K07 (ledger per company builds on tenant isolation that already exists), K09, K10 — each needs its ADR and migration approval; fictional data only in tests.
4. **Banking is read-only first** (K08): provider choice, contract and real-bank consent are owner decisions; MAOS never initiates transfers (also the rule for the AI assistant, L05/L08).
5. **Company master data for accounting** (Beraternummer, Mandantennummer, fiscal year, SKR, account length, debtor numbering) lives in `TenantSettings` (J01, O24), not in code.

## Open owner decisions touching finance
O6 (upload limit — unrelated), O24 (TenantSettings), O29 (DATEV route), O30 (SKR / account length / debtors), D6 (VAT model, recorded in K04), K08 provider.
