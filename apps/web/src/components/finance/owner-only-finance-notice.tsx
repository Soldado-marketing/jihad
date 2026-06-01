export function OwnerOnlyFinanceNotice() {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <h3 className="font-semibold">Owner-only financial access</h3>
      <p className="mt-1 leading-6">
        Sprint 9 finance pages are restricted to Owner navigation. Manager, Employee, and Client
        access must remain denied by backend permissions and service-level checks.
      </p>
    </section>
  );
}
