import { HiddenDataNotice } from '@/components/dashboard/hidden-data-notice';

export function ReportRunPanel() {
  return (
    <section aria-label="Report run placeholder" className="grid gap-4">
      <div className="rounded-md border border-line bg-panel p-4">
        <h3 className="font-semibold text-ink">Report run placeholder</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Sprint 10 report runs return permission-filtered rows only. Export, scheduling, and
          custom builders are deferred.
        </p>
      </div>
      <HiddenDataNotice />
    </section>
  );
}
