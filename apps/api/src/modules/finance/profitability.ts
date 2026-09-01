/**
 * Phase 4 - Profitability arithmetic.
 *
 * Money stays in integer cents. The margin PERCENTAGE is the only derived
 * float, and it is a display metric - it is never used to compute an amount.
 *
 * Pure functions, no I/O - unit-testable directly.
 */

export interface ProfitabilityInput {
  revenueCents: number;
  costCents: number;
}

export interface Profitability {
  revenueCents: number;
  costCents: number;
  marginCents: number;
  /**
   * Margin as a percentage of revenue, one decimal place.
   * null when there is no revenue: a margin percentage of zero revenue is
   * undefined, and reporting 0 or Infinity would both be misleading.
   */
  marginPercent: number | null;
}

export function computeProfitability(input: ProfitabilityInput): Profitability {
  const revenueCents = Math.trunc(input.revenueCents ?? 0);
  const costCents = Math.trunc(input.costCents ?? 0);
  const marginCents = revenueCents - costCents;

  const marginPercent =
    revenueCents === 0 ? null : Math.round((marginCents / revenueCents) * 1000) / 10;

  return { costCents, marginCents, marginPercent, revenueCents };
}

export interface ProjectTotals {
  projectId: string | null;
  projectName: string | null;
  revenueCents: number;
  costCents: number;
}

export interface ProjectProfitability extends Profitability {
  projectId: string | null;
  projectName: string | null;
}

/**
 * Joins revenue and cost totals per project into one ranked view.
 *
 * A project that has only costs still appears (with negative margin) - hiding
 * it would make an unprofitable project invisible, which is the opposite of
 * what this report is for. Rows are ordered by margin, worst first, so the
 * items needing attention are at the top.
 */
export function buildProjectProfitability(
  revenueByProject: Map<string | null, { name: string | null; cents: number }>,
  costByProject: Map<string | null, { name: string | null; cents: number }>,
): ProjectProfitability[] {
  const projectIds = new Set<string | null>([
    ...revenueByProject.keys(),
    ...costByProject.keys(),
  ]);

  const rows = [...projectIds].map((projectId) => {
    const revenue = revenueByProject.get(projectId);
    const cost = costByProject.get(projectId);

    return {
      projectId,
      projectName: revenue?.name ?? cost?.name ?? null,
      ...computeProfitability({
        costCents: cost?.cents ?? 0,
        revenueCents: revenue?.cents ?? 0,
      }),
    };
  });

  return rows.sort((a, b) => a.marginCents - b.marginCents);
}
