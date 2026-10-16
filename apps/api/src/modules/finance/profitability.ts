/**
 * Phase 4 - Profitability arithmetic.
 *
 * Money stays in integer cents. The margin PERCENTAGE is the only derived
 * float, and it is a display metric - it is never used to compute an amount.
 *
 * MAOS-T74 (ADR-018 §6): a project's cost is its recorded costs plus the
 * labour cost STORED on its time entries (billable and non-billable; frozen
 * when each entry was rated, never recomputed from current rates). Minutes
 * without a rate are reported separately and make the result `incomplete`:
 * the cost is then a lower bound and the margin an upper bound, never a
 * figure that treats unknown labour as free.
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

/** Labour of one project, as summed from stored time entries (see labour-cost.ts summariseLabour). */
export interface ProjectLabour {
  name: string | null;
  costCents: number;
  ratedMinutes: number;
  unratedMinutes: number;
}

export interface ProjectProfitability extends Profitability {
  projectId: string | null;
  projectName: string | null;
  /** Manually recorded costs (CostRecord). costCents = recordedCostCents + labourCostCents. */
  recordedCostCents: number;
  labourCostCents: number;
  ratedMinutes: number;
  unratedMinutes: number;
  /** True when some minutes have no rate: cost is a lower bound, margin an upper bound. */
  incomplete: boolean;
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
  labourByProject: Map<string | null, ProjectLabour> = new Map(),
): ProjectProfitability[] {
  const projectIds = new Set<string | null>([
    ...revenueByProject.keys(),
    ...costByProject.keys(),
    ...labourByProject.keys(),
  ]);

  const rows = [...projectIds].map((projectId) => {
    const revenue = revenueByProject.get(projectId);
    const cost = costByProject.get(projectId);
    const labour = labourByProject.get(projectId);
    const recordedCostCents = cost?.cents ?? 0;
    const labourCostCents = labour?.costCents ?? 0;
    const unratedMinutes = labour?.unratedMinutes ?? 0;

    return {
      projectId,
      projectName: revenue?.name ?? cost?.name ?? labour?.name ?? null,
      ...computeProfitability({
        costCents: recordedCostCents + labourCostCents,
        revenueCents: revenue?.cents ?? 0,
      }),
      recordedCostCents,
      labourCostCents,
      ratedMinutes: labour?.ratedMinutes ?? 0,
      unratedMinutes,
      incomplete: unratedMinutes > 0,
    };
  });

  return rows.sort((a, b) => a.marginCents - b.marginCents);
}
