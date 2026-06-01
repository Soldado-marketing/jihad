import { ReportList, type ReportListItem } from '@/components/reports/report-list';
import { HiddenDataNotice } from '@/components/dashboard/hidden-data-notice';

const sprint10Reports: ReportListItem[] = [
  {
    id: 'sprint-10-report-placeholder',
    name: 'MVP delivery summary',
    visibility: 'INTERNAL',
  },
];

export default function ReportsPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="reports-title">
        <p className="text-sm font-medium text-slate-600">Sprint 10</p>
        <h2 id="reports-title" className="mt-2 text-3xl font-semibold text-ink">
          Reports
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Basic permission-filtered report definitions and run placeholders.
        </p>
      </section>
      <HiddenDataNotice />
      <ReportList reports={sprint10Reports} />
    </div>
  );
}
