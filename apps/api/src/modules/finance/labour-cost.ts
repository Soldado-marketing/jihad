/**
 * ADR-018 rate resolution and labour cost: the one implementation (MAOS-T73,
 * T74, F-6). The rates and time-entries services and finance import it.
 *
 * Pure functions, no I/O. The database enforces the same rules (T71:
 * Rate_scope_key_check, unique (tenantId, scopeKey, validFrom),
 * TimeEntry_cost_formula_check); these produce exactly the values those
 * checks accept.
 *
 * - Rates are integer cents per hour, effective-dated with `validFrom`
 *   (a calendar date), resolved for the entry's date.
 * - Resolution order, first match wins: the member's own rate, the default for
 *   the member's role, the tenant default. No match = unrated (never 0).
 * - Cost = minutes x rate / 60, rounded half up to an integer, computed once
 *   and frozen on the entry; totals sum stored costs and report unrated
 *   minutes separately, so unknown labour never reads as free.
 */

export type RateSource = 'MEMBER' | 'ROLE' | 'TENANT';

export interface ResolvedRate {
  rateCents: number;
  rateSource: RateSource;
  currency: string;
}

/** The unique-key target of a rate (T71): "TENANT", "ROLE:<role>" or "MEMBER:<userId>". */
export function scopeKeyFor(scope: RateSource, userId?: string | null, role?: string | null): string {
  if (scope === 'TENANT') return 'TENANT';
  if (scope === 'ROLE') return `ROLE:${role}`;
  return `MEMBER:${userId}`;
}

/** A stored rate as the rates service loads it. */
export interface RateCandidate {
  scope: RateSource;
  scopeKey: string;
  rateCents: number;
  currency: string;
  validFrom: Date;
}

const ORDER: RateSource[] = ['MEMBER', 'ROLE', 'TENANT'];

/**
 * ADR-018 §2, first match wins: the member's own rate, then the default for the
 * member's role, then the tenant default; within a scope the newest validFrom on
 * or before the entry day. null = unrated (never 0).
 */
export function pickRate(candidates: readonly RateCandidate[], day: Date, userId: string, role: string): ResolvedRate | null {
  const wanted: Record<RateSource, string> = { MEMBER: scopeKeyFor('MEMBER', userId), ROLE: scopeKeyFor('ROLE', null, role), TENANT: 'TENANT' };
  for (const scope of ORDER) {
    const best = candidates
      .filter((c) => c.scope === scope && c.scopeKey === wanted[scope] && c.validFrom.getTime() <= day.getTime())
      .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0];
    if (best) return { rateCents: best.rateCents, rateSource: scope, currency: best.currency };
  }
  return null;
}

/**
 * costCents = round_half_up(minutes x rateCents / 60) in integer cents (ADR-018 §4).
 * minutes <= 1440 and rateCents <= the T73 maximum keep the product far below 2^53,
 * so this is exact, and the result fits the integer column.
 */
export function costCents(minutes: number, rateCents: number): number {
  return Math.floor((minutes * rateCents + 30) / 60);
}

/** Rates per source with calendar-date strings (YYYY-MM-DD), for validated callers. */
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

const utcDay = (date: string) => new Date(`${date}T00:00:00Z`);

/** pickRate over per-source date strings, validating each source before it is used. */
export function resolveRate(sources: RateSources, date: string): ResolvedRate | null {
  assertDate(date, 'date');
  const bySource: [RateSource, readonly EffectiveRate[] | undefined][] = [
    ['MEMBER', sources.member],
    ['ROLE', sources.role],
    ['TENANT', sources.tenant],
  ];
  for (const [scope, rates] of bySource) {
    for (const r of rates ?? []) {
      assertDate(r.validFrom, 'validFrom');
      assertRate(r.rateCents);
    }
    const candidates = (rates ?? []).map((r) => ({
      scope,
      scopeKey: scopeKeyFor(scope, 'member', 'role'),
      rateCents: r.rateCents,
      currency: r.currency,
      validFrom: utcDay(r.validFrom),
    }));
    const hit = pickRate(candidates, utcDay(date), 'member', 'role');
    if (hit) return hit;
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
  return costCents(minutes, rateCents);
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
