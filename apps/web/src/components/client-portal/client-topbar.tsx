export function ClientTopbar() {
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3 sm:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Client portal
        </p>
        <h1 className="text-xl font-semibold text-ink">Client workspace</h1>
      </div>
      <div className="rounded-md border border-line px-3 py-2 text-xs text-slate-600">
        Client-safe view
      </div>
    </header>
  );
}
