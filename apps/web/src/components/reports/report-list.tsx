import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';

export type ReportListItem = {
  id: string;
  name: string;
  visibility: 'INTERNAL' | 'OWNER_ONLY' | 'CLIENT_SAFE';
};

export function ReportList({ reports }: { reports: ReportListItem[] }) {
  if (reports.length === 0) {
    return <EmptyState title="No reports" description="Basic report definitions appear here." />;
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Report list">
      {reports.map((report) => (
        <li key={report.id}>
          <Link className="block p-4 hover:bg-slate-50 focus-visible:bg-slate-50" href={`/reports/${report.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold text-ink">{report.name}</span>
              <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                {report.visibility}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
