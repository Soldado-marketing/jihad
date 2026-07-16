import { ReportRunPanel } from './report-run-panel';

export function ReportDetail() {
  return (
    <section aria-label="Report detail" className="grid gap-4">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <p className="text-sm font-medium text-slate-600">Basic report</p>
        <h3 className="mt-2 text-xl font-semibold text-ink">MVP delivery summary</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Permission-filtered report definition for Owner and Manager review. Live report execution still needs persistent data and production access controls.
        </p>
      </div>
      <ReportRunPanel />
    </section>
  );
}
