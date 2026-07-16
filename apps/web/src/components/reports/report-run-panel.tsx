import { HiddenDataNotice } from '@/components/dashboard/hidden-data-notice';

export function ReportRunPanel() {
  return (
    <section aria-label="Report run preview" className="grid gap-4">
      <div className="rounded-2xl border border-line bg-white p-5 shadow-lift">
        <h3 className="font-semibold text-ink">Report run preview</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Report runs return permission-filtered rows only. Automated delivery and advanced
          builders are deferred.
        </p>
      </div>
      <HiddenDataNotice />
    </section>
  );
}
