/**
 * ADR-018 rate resolution and cost, as pure functions (MAOS-T73). The same
 * rules are enforced by the database (T71: Rate_scope_key_check, unique
 * (tenantId, scopeKey, validFrom), TimeEntry_cost_formula_check); these
 * produce exactly the values those checks accept.
 */

export type RateScopeName = 'MEMBER' | 'ROLE' | 'TENANT';

/** The unique-key target of a rate (T71): "TENANT", "ROLE:<role>" or "MEMBER:<userId>". */
export function scopeKeyFor(scope: RateScopeName, userId?: string | null, role?: string | null): string {
  if (scope === 'TENANT') return 'TENANT';
  if (scope === 'ROLE') return `ROLE:${role}`;
  return `MEMBER:${userId}`;
}

/**
 * costCents = round_half_up(minutes x rateCents / 60) in integer cents (ADR-018 §4).
 * minutes <= 1440 and rateCents <= MAX_RATE_CENTS keep the product far below 2^53, so this
 * is exact, and the result fits the integer column.
 */
export function costCents(minutes: number, rateCents: number): number {
  return Math.floor((minutes * rateCents + 30) / 60);
}

export interface RateCandidate {
  scope: RateScopeName;
  scopeKey: string;
  rateCents: number;
  currency: string;
  validFrom: Date;
}

export interface ResolvedRate {
  rateCents: number;
  rateSource: RateScopeName;
  currency: string;
}

const ORDER: RateScopeName[] = ['MEMBER', 'ROLE', 'TENANT'];

/**
 * First match wins (ADR-018 §2): the member's own rate, then the default for the
 * member's role, then the tenant default; within a scope the newest validFrom on
 * or before the entry day. null = unrated (never 0).
 */
export function pickRate(candidates: readonly RateCandidate[], day: Date, userId: string, role: string): ResolvedRate | null {
  const wanted: Record<RateScopeName, string> = { MEMBER: scopeKeyFor('MEMBER', userId), ROLE: scopeKeyFor('ROLE', null, role), TENANT: 'TENANT' };
  for (const scope of ORDER) {
    const best = candidates
      .filter((c) => c.scope === scope && c.scopeKey === wanted[scope] && c.validFrom.getTime() <= day.getTime())
      .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0];
    if (best) return { rateCents: best.rateCents, rateSource: scope, currency: best.currency };
  }
  return null;
}
