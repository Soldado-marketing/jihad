import { SummaryCard } from './summary-card';

export function FinanceSummaryOwnerOnly() {
  return (
    <SummaryCard
      detail="Revenue, costs, invoices, and payments. Visible to Owner only."
      label="Finance"
      value="Owner only"
    />
  );
}
