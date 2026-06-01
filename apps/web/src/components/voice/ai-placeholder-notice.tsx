export function AIPlaceholderNotice() {
  return (
    <section className="rounded-md border border-line bg-panel p-4" aria-label="AI placeholder policy">
      <h2 className="text-sm font-semibold text-ink">AI safety placeholder</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Transcript extraction creates a draft only. External provider calls are not active, and human confirmation is required.
      </p>
    </section>
  );
}
