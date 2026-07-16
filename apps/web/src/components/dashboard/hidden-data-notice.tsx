export function HiddenDataNotice() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-[0_14px_32px_-28px_rgba(180,83,9,0.6)]">
      <h3 className="font-semibold">Restricted data is suppressed</h3>
      <p className="mt-1 leading-6">
        Counts and totals that the current role cannot access are shown as restricted, not
        leaked as zeroes or hidden aggregates.
      </p>
    </section>
  );
}
