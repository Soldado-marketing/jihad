import { SummaryCard } from './summary-card';

export function FinanceSummaryOwnerOnly() {
  return (
    <SummaryCard
      detail="Owner-only finance placeholder. Suppressed for Manager, Employee, and Client roles."
      label="Finance"
      value="Owner only"
    />
  );
}
