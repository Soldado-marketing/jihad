# MAOS Payment Provider Shortlist

## Payment Provider Options

| Option | Notes |
|---|---|
| Stripe | Strong card/payment ecosystem; currency/country support must be confirmed |
| PayPal | Broad client familiarity; reconciliation and fee handling need review |
| Manual bank transfer tracking | MVP-safe fallback for recording payment status without payment processing integration |
| Regional provider | May be needed for AED/SAR support depending target market |

## MVP Manual Fallback

The MVP can record invoices, partial payments, and payment statuses manually without live payment processing if provider selection is not complete by Sprint 9.

## Supported Currencies Expectation

Provider or manual workflow must account for EUR, USD, AED, and SAR.

## Owner

Finance Owner / CTO.

## Assigned Sprint 9 Gate

Payment provider or manual fallback must be approved before Finance Basic exits Sprint 9.

## Risk If Unresolved

Live payment processing may be deferred; invoice/payment tracking can still proceed manually.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Payment provider options are documented | Met |
| MVP manual fallback is documented | Met |
| Supported currencies expectation is documented | Met |
| Owner is documented | Met |
| Sprint 9 gate is documented | Met |
