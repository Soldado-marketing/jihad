export function OwnerOnlyFinanceNotice() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-lift">
      <h3 className="font-semibold">Owner-only financial access</h3>
      <p className="mt-1 leading-6">
        Finance pages are restricted to Owner navigation. Manager, Employee, and Client
        access must remain denied by backend permissions and service-level checks.
      </p>
    </section>
  );
}
