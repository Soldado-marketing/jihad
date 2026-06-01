export type ProfitabilitySummary = {
  revenue: string;
  costs: string;
  grossProfit: string;
};

export function ProfitabilitySummaryCard({ summary }: { summary: ProfitabilitySummary }) {
  return (
    <section aria-label="Profitability placeholder" className="grid gap-3 md:grid-cols-3">
      <div className="rounded-md border border-line bg-panel p-4">
        <p className="text-sm text-slate-600">Revenue</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{summary.revenue}</p>
      </div>
      <div className="rounded-md border border-line bg-panel p-4">
        <p className="text-sm text-slate-600">Costs</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{summary.costs}</p>
      </div>
      <div className="rounded-md border border-line bg-panel p-4">
        <p className="text-sm text-slate-600">Basic placeholder margin</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{summary.grossProfit}</p>
      </div>
    </section>
  );
}
