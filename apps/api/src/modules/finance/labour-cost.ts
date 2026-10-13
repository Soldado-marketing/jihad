/**
 * Labour cost arithmetic (ADR-018, building blocks for MAOS-T73/T74).
 *
 * Pure functions, no I/O, no schema: the TimeEntry/Rate tables (T71) are
 * migration-gated, and these rules are fixed by the accepted ADR, so they are
 * implemented and tested now and wired in when the tables exist.
 *
 * - Rates are integer cents per hour, effective-dated with `validFrom`
 *   (a calendar date, YYYY-MM-DD), resolved for the entry's date.
 * - Resolution order, first match wins: the member's own rate, the default for
 *   the member's role, the tenant default. No match = unrated (never 0).
 * - Cost = minutes x rate / 60, rounded half up to an integer, computed once
 *   and frozen on the entry; totals sum stored costs and report unrated
 *   minutes separately, so unknown labour never reads as free.
 */

export type RateSource = 'MEMBER' | 'ROLE' | 'TENANT';

export interface EffectiveRate {
  rateCents: number;
  validFrom: string;
  currency: string;
}

export interface RateSources {
  member?: readonly EffectiveRate[];
  role?: readonly EffectiveRate[];
  tenant?: readonly EffectiveRate[];
}

export interface ResolvedRate {
  rateCents: number;
  currency: string;
  source: RateSource;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(value: string, what: string): void {
  if (!DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new RangeError(`${what} must be a calendar date (YYYY-MM-DD)`);
  }
}

function assertRate(rateCents: number): void {
  if (!Number.isSafeInteger(rateCents) || rateCents < 0) {
    throw new RangeError('rateCents must be a non-negative integer');
  }
}

/** The rate in force on `date` within one source: the latest validFrom on or before it. */
function inForce(rates: readonly EffectiveRate[] | undefined, date: string): EffectiveRate | null {
  let best: EffectiveRate | null = null;
  for (const r of rates ?? []) {
    assertDate(r.validFrom, 'validFrom');
    assertRate(r.rateCents);
    if (r.validFrom <= date && (best === null || r.validFrom > best.validFrom)) best = r;
  }
  return best;
}

/** ADR-018 §2: member, then role default, then tenant default; null = unrated. */
export function resolveRate(sources: RateSources, date: string): ResolvedRate | null {
  assertDate(date, 'date');
  const order: [RateSource, readonly EffectiveRate[] | undefined][] = [
    ['MEMBER', sources.member],
    ['ROLE', sources.role],
    ['TENANT', sources.tenant],
  ];
  for (const [source, rates] of order) {
    const r = inForce(rates, date);
    if (r) return { rateCents: r.rateCents, currency: r.currency, source };
  }
  return null;
}

/** ADR-018 §1: one entry is 1 to 1440 whole minutes. */
export function assertEntryMinutes(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new RangeError('minutes must be an integer from 1 to 1440');
  }
}

/** ADR-018 §4: round_half_up(minutes x rateCents / 60), integer arithmetic only. */
export function entryCostCents(minutes: number, rateCents: number): number {
  assertEntryMinutes(minutes);
  assertRate(rateCents);
  return Math.floor((minutes * rateCents + 30) / 60);
}

export interface StoredEntry {
  minutes: number;
  /** Frozen at creation; null when the entry was stored unrated. */
  costCents: number | null;
}

export interface LabourSummary {
  ratedMinutes: number;
  unratedMinutes: number;
  costCents: number;
  /** True when some minutes have no rate: the cost (and any margin) is a lower bound. */
  incomplete: boolean;
}

/** ADR-018 §6: sum stored costs; never re-rate, never count unrated minutes as 0 cost silently. */
export function summariseLabour(entries: readonly StoredEntry[]): LabourSummary {
  let ratedMinutes = 0;
  let unratedMinutes = 0;
  let costCents = 0;
  for (const e of entries) {
    if (e.costCents === null) {
      unratedMinutes += e.minutes;
    } else {
      ratedMinutes += e.minutes;
      costCents += e.costCents;
    }
  }
  return { ratedMinutes, unratedMinutes, costCents, incomplete: unratedMinutes > 0 };
}
