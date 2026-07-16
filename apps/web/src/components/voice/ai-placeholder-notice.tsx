export function AIPlaceholderNotice() {
  return (
    <section className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-lift" aria-label="AI safety policy">
      <h2 className="text-sm font-semibold text-purple-950">AI extraction is not active</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Transcript extraction creates a draft only. External provider calls are not active, and human confirmation is required.
      </p>
    </section>
  );
}
