export function RealtimeStatusNotice() {
  return (
    <section className="rounded-md border border-line bg-panel p-4" aria-label="Realtime status">
      <h2 className="text-sm font-semibold text-ink">Realtime foundation</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Channel subscriptions require tenant context, membership checks, session validation, and minimal event payloads.
      </p>
    </section>
  );
}
