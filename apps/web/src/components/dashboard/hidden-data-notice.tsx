export function HiddenDataNotice() {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <h3 className="font-semibold">Hidden data suppressed</h3>
      <p className="mt-1 leading-6">
        Counts and totals that the current role cannot access are represented as suppressed
        placeholders, not leaked as zeroes or hidden aggregates.
      </p>
    </section>
  );
}
