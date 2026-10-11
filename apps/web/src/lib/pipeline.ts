/**
 * CRM pipeline grouping (MAOS-T62).
 *
 * Seven stages in sales order, each with its count and its value. Values are
 * summed per currency in integer cents and never added across currencies -
 * "EUR 1,500 + USD 200" is two totals, not one number.
 */

export const PIPELINE_STAGES = [
  { status: 'LEAD', label: 'Lead' },
  { status: 'CONTACTED', label: 'Contacted' },
  { status: 'MEETING', label: 'Meeting' },
  { status: 'PROPOSAL', label: 'Proposal' },
  { status: 'NEGOTIATION', label: 'Negotiation' },
  { status: 'WON', label: 'Won' },
  { status: 'LOST', label: 'Lost' },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['status'];

export interface PipelineItem {
  id: string;
  status: string;
  valueCents?: number | null;
  currency?: string | null;
}

export interface StageColumn<T extends PipelineItem> {
  status: PipelineStage;
  label: string;
  items: T[];
  count: number;
  /** Currency code -> integer cents, sorted by currency. */
  totals: [string, number][];
}

export function groupByStage<T extends PipelineItem>(items: readonly T[]): StageColumn<T>[] {
  return PIPELINE_STAGES.map(({ status, label }) => {
    const inStage = items.filter((i) => i.status === status);
    const sums = new Map<string, number>();
    for (const i of inStage) {
      if (typeof i.valueCents === 'number' && Number.isInteger(i.valueCents) && i.valueCents > 0) {
        const cur = (i.currency || 'EUR').toUpperCase();
        sums.set(cur, (sums.get(cur) ?? 0) + i.valueCents);
      }
    }
    return {
      status,
      label,
      items: inStage,
      count: inStage.length,
      totals: [...sums.entries()].sort(([a], [b]) => a.localeCompare(b)),
    };
  });
}

export function isPipelineStage(value: string): value is PipelineStage {
  return PIPELINE_STAGES.some((s) => s.status === value);
}
