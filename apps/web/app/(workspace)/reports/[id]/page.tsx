import { ReportDetail } from '@/components/reports/report-detail';

export default function ReportDetailPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="report-detail-title">
        <p className="text-sm font-medium text-slate-600">Sprint 10</p>
        <h2 id="report-detail-title" className="mt-2 text-3xl font-semibold text-ink">
          Report Detail
        </h2>
      </section>
      <ReportDetail />
    </div>
  );
}
