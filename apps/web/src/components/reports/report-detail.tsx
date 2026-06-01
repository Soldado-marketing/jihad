import { ReportRunPanel } from './report-run-panel';

export function ReportDetail() {
  return (
    <section aria-label="Report detail" className="grid gap-4">
      <div className="rounded-md border border-line bg-panel p-5">
        <p className="text-sm font-medium text-slate-600">Basic report</p>
        <h3 className="mt-2 text-xl font-semibold text-ink">MVP delivery summary</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Permission-filtered report definition placeholder for Owner and Manager review.
        </p>
      </div>
      <ReportRunPanel />
    </section>
  );
}
