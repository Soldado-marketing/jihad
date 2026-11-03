# MAOS K06 — DATEV-compatible export: specification verification (research only)

**Task:** K06 "DATEV-compatible export — spec verification first" (master task list, Phase 4 Finance).
**Date:** 2026-11-03. **Scope:** documentation only. No code, no schema change, no migration, no bank, no real financial data.
**Result in one line:** the target is a **DATEV-Format Buchungsstapel** file (EXTF, version 700, format category 21, format version 13) plus, later, a **Debitoren/Kreditoren** file (category 16); MAOS can already fill the five mandatory booking fields for customer invoices and payments, but it has **no account plan, no VAT model and no journal**, so a correct export needs K01 and K04 first.

## 1. What "DATEV-compatible" means for MAOS

Three ways exist to get bookings into a tax adviser's DATEV system:

| Way | What it is | Fit for MAOS now |
|---|---|---|
| **DATEV-Format (CSV, "EXTF")** | A semicolon-separated text file imported in *DATEV Kanzlei-Rechnungswesen / Rechnungswesen* through *Bestand → Importieren → Stapelverarbeitung*. Documented publicly by DATEV; no contract, no certification needed to produce a file. | **First target.** Offline, auditable, nothing leaves MAOS automatically. |
| **DATEV Unternehmen online (Belege + Stapel)** | The same file plus a ZIP of receipts (≤ 20 MB per file, ≤ 5,000 documents; receipts first, then the batch). | Second step once invoices are exported as PDF receipts (MAOS has `invoice-pdf.service.ts`). |
| **Buchungsdatenservice (API)** | DATEV's cloud API for programs that push bookings and receipts directly; requires a DATEV developer partnership, authentication and a certification process. | **Not now.** New external integration → Blueprint §30 check 9, owner decision. |

**Decision for K06:** implement the EXTF Buchungsstapel file (and later the Debitoren/Kreditoren file). The API route is recorded as a later owner decision.

## 2. The file (verified against public sources)

**Name:** `EXTF_<name>.csv` (prefix `EXTF_` for files created outside DATEV; DATEV's own exports use `DTVF`).
**Encoding:** Windows-1252 (ANSI), **not** UTF-8. Lines end with CR LF. Fields separated by `;`; text fields in double quotes; amounts with a **decimal comma** and no thousands separator.
**Structure:** line 1 = header (31 fields), line 2 = the 125 column names, line 3+ = one booking per line (125 fields, empty fields keep their position).

### 2.1 Header line (31 fields)

| # | Field | Value for MAOS | Note |
|---|---|---|---|
| 1 | Kennzeichen | `"EXTF"` | fixed |
| 2 | Versionsnummer | `700` | fixed since 10/2018 |
| 3 | Formatkategorie | `21` | Buchungsstapel (16 = Debitoren/Kreditoren, 20 = Sachkontenbeschriftungen) |
| 4 | Formatname | `"Buchungsstapel"` | |
| 5 | Formatversion | `13` | current for category 21 (10 → 11 → 12 → 13, Feb 2024). Third-party libraries still write 12; DATEV reads older versions |
| 6 | Erzeugt am | `JJJJMMTTHHMMSSmmm` | export timestamp |
| 7 | Importiert | empty | set by DATEV |
| 8 | Herkunft | `"RE"` or any 2 letters | replaced by `SV` on import |
| 9 | Exportiert von | `"MAOS"` or the exporting user | ≤ 25 chars |
| 10 | Importiert von | empty | |
| 11 | Beraternummer | 1001…9999999 | **per company, from the tax adviser** |
| 12 | Mandantennummer | 1…99999 | **per company, from the tax adviser** |
| 13 | WJ-Beginn | `JJJJMMTT` | fiscal-year start, per company |
| 14 | Sachkontenlänge | 4…8 | **must match the adviser's client file**; wrong value = import error REW10152/REW10153 |
| 15/16 | Datum vom / bis | `JJJJMMTT` | export period |
| 17 | Bezeichnung | ≤ 30 chars | e.g. `"MAOS Ausgangsrechnungen 2026-03"` |
| 18 | Diktatkürzel | 2 letters | optional |
| 19 | Buchungstyp | `1` | Finanzbuchführung |
| 20 | Rechnungslegungszweck | `0` or empty | |
| 21 | Festschreibung | `0` | leave unlocked so the adviser can correct; `1` locks the whole batch |
| 22 | WKZ | `"EUR"` | |
| 27 | SKR | `"03"` or `"04"` | **per company** |
| 23–26, 28–31 | reserved / Anwendungsinformation | empty | |

### 2.2 Booking line — the fields MAOS would fill

Mandatory (5): **Umsatz (ohne Soll/Haben-Kz)** (always positive, 2 decimals), **Soll/Haben-Kennzeichen** (`S`/`H`, refers to the account in field 7), **Konto**, **Gegenkonto (ohne BU-Schlüssel)**, **Belegdatum** (`TTMM`; the year comes from header field 13, so one file must not span two fiscal years).

Optional but needed for a useful export: **BU-Schlüssel** (field 9; empty on automatic-tax accounts, otherwise the tax key — e.g. `40` cancels an automatic function; reverse-charge keys explicit), **Belegfeld 1** (field 11, ≤ 36 chars, `[A-Za-z0-9$&%*+-/]` — the invoice number; it is the open-item key for payments), **Belegfeld 2** (≤ 12), **Buchungstext** (field 14, ≤ 60), **KOST1/KOST2** (37/38, ≤ 36 — project or customer as cost centre), **Leistungsdatum** (115, `TTMMJJJJ`), **Festschreibung** (114, `0`), **Steuersatz** (119) and **Land** (120) for OSS cases, **Auftragsnummer** (95, ≤ 30 — project id).

Reversals: never a negative amount; swap `S`/`H` (or use field 118 Generalumkehr = `1`).
Account numbers: Sachkonten with header length; Personenkonten (debtors/creditors) at most one digit longer; a shorter number is right-padded with zeros on import (REW10153) — MAOS must emit the exact length.

### 2.3 Debtors (category 16) — later

One line per customer with the debtor account number (SKR03/SKR04 range 10000–69999), name, address, VAT id, payment terms. Needed once invoices are booked against debtor accounts instead of a collective account.

## 3. Account plan: what SKR03/SKR04 need from MAOS

MAOS stores no account numbers. Every booking needs a **mapping table per company** (owner/tax adviser decides); commonly cited defaults, to be **confirmed by the adviser**, not asserted by MAOS:

| Purpose | SKR03 | SKR04 |
|---|---|---|
| Revenue 19 % (automatic tax) | 8400 | 4400 |
| Revenue 7 % | 8300 | 4300 |
| Revenue tax-free / EU / §13b | 8125 / 8336 … | 4125 / 4336 … |
| Trade receivables (collective) | 1400 | 1200 |
| Bank | 1200 | 1800 |
| Cash | 1000 | 1600 |
| Output VAT 19 % | 1776 | 3806 |
| Input VAT 19 % | 1576 | 1406 |
| Trade payables (collective) | 1600 | 3300 |

With automatic-tax revenue accounts the BU-Schlüssel stays empty and DATEV computes VAT from the gross amount. MAOS must therefore know, per invoice line, the **tax rate and whether the account is automatic** — neither exists today.

## 4. What MAOS holds today vs. what the export needs

| Export need | MAOS today (Prisma) | Gap |
|---|---|---|
| Gross amount, currency | `Invoice.totalCents`, `currency`; `Payment.amountCents` | none (cents → `12,34`) |
| Net and VAT per rate | `Invoice.subtotalCents` only; `InvoiceLine` has no tax rate | **K04:** VAT model (rate per line, net/tax/gross), tax-free and reverse-charge cases |
| Document date / service date | `Invoice.issuedAt`, `dueAt` | service date (Leistungsdatum) missing on invoices |
| Document number (Belegfeld 1) | `Invoice.invoiceNumber` | fine; payments need the invoice number for open-item matching (`Payment.invoiceId` → number) |
| Accounts (Konto/Gegenkonto) | none | **K01:** account plan, SKR choice, mapping table per company, debtor numbers per customer |
| Supplier bills, credit notes | `CostRecord` (amount, type, vendor) — no document number, no VAT, no creditor | **K02:** supplier bills and credit notes as documents |
| Journal / period lock | none | **K01:** journal with posting date, period, lock before export; export must be repeatable and idempotent per period |
| Company master data (Berater-/Mandantennummer, WJ, SKR, account length) | none (`Tenant` has name/slug/status) | **J01 / TenantSettings** (O24) |
| Cost centres | `Project`, `Customer` ids | optional mapping (KOST1 = project, KOST2 = customer) |
| Receipts (Unternehmen online) | invoice PDF service exists | later step; ZIP packaging |

## 5. Proposed K06 implementation plan (after K01, K04; schema-gated)

1. **K06-a Export model (no schema if K01 exists):** per company settings `datev` (Beraternummer, Mandantennummer, WJ-Beginn, Sachkontenlänge, SKR, account mapping, debtor numbering) — in `TenantSettings` (O24).
2. **K06-b Writer:** pure function `writeBuchungsstapel(header, bookings): Buffer` producing Windows-1252 bytes, CRLF, quoting, decimal comma, 125 columns, positive amounts with S/H, `TTMM` dates, zero-padded accounts; unit tests with golden files; a validator that refuses two fiscal years in one file, zero amounts, bad `Belegfeld 1` characters and account lengths.
3. **K06-c Source mapping:** issued invoices → revenue bookings per VAT rate (debtor or collective receivables against revenue account, BU key per rate); payments → bank against debtor with `Belegfeld 1` = invoice number; cost records → expense against creditor/collective payables once K02 exists.
4. **K06-d Endpoint and UI:** OWNER-only (`FINANCE` resource, sensitive) `GET /finance/exports/datev?from&to` returning the file as attachment, audited (`finance.datev_export`), with the period recorded so re-exports are flagged; later `category 16` debtors file.
5. **K06-e Verification:** fictional company export imported into a DATEV test client by the adviser, or validated with a DATEV-format checker; acceptance = import protocol without errors.

## 6. Owner decisions this research raises

- **O29** Which route first: EXTF file only (recommended) vs. Buchungsdatenservice API (new external integration, certification).
- **O30** SKR03 or SKR04 per company, Sachkontenlänge, and whether debtor accounts per customer are wanted from the start (asked of the tax adviser).
- K06 implementation stays **blocked by K01 (journal/accounts) and K04 (VAT)**, both schema-gated.

## Sources (public, read 2026-11-03)

- DATEV Developer Portal — DATEV-Format: Einstieg and Header pages (client-rendered; values confirmed through the search summary): https://developer.datev.de/datev/platform/en/dtvf and https://developer.datev.de/datev/platform/en/dtvf/formate/header
- DATEV document 1003221 (Buchungsstapel field description; mandatory fields, TTMM, S/H rule): https://www.datev.de/dnlexom/v2/content/documents/1003221/pdf
- Field-by-field schema of the 125 booking columns and 31 header fields (third-party, mirrors the DATEV guide): https://github.com/ledermann/datev (`lib/datev/base/header.rb`, `booking.rb`)
- Practitioner guide with format versions, import steps and error codes REW10152/REW10153: https://usemeridian.de/guides/datev-extf-buchungsstapel
- DATEV Community threads on BU-Schlüssel with automatic accounts and reversals: https://www.datev-community.de/
