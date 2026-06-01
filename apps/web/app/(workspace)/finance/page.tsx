import { FinanceOverview } from '@/components/finance/finance-overview';

export default function FinancePage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="finance-title">
        <p className="text-sm font-medium text-slate-600">Sprint 9</p>
        <h2 id="finance-title" className="mt-2 text-3xl font-semibold text-ink">
          Finance
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Owner-only revenue, cost, invoice, and manual payment foundations.
        </p>
      </section>
      <FinanceOverview />
    </div>
  );
}
