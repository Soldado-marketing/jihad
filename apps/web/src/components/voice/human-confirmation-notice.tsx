export function HumanConfirmationNotice() {
  return (
    <section className="rounded-md border border-line bg-panel p-4" aria-label="Human confirmation requirement">
      <h2 className="text-sm font-semibold text-ink">Human confirmation required</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Voice-to-task output stays as a draft until an authorized user reviews and confirms it.
      </p>
    </section>
  );
}
