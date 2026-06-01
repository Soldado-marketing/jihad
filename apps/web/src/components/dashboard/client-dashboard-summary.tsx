import { SummaryCard } from './summary-card';
import { HiddenDataNotice } from './hidden-data-notice';

export function ClientDashboardSummary() {
  return (
    <div className="grid gap-4">
      <section aria-label="Client summary" className="grid gap-3 md:grid-cols-3">
        <SummaryCard detail="Client-visible project placeholders only." label="Projects" value="2" />
        <SummaryCard detail="Client-visible task placeholders only." label="Tasks" value="5" />
        <SummaryCard detail="Client-visible invoice placeholders only." label="Invoices" value="1" />
      </section>
      <HiddenDataNotice />
    </div>
  );
}
