type DeniedStateProps = {
  title?: string;
  description?: string;
};

export function DeniedState({
  title = 'Access unavailable',
  description = 'This area is not available for the current role.',
}: DeniedStateProps) {
  return (
    <section
      aria-labelledby="denied-state-title"
      className="rounded-md border border-line bg-panel p-6 shadow-shell"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-danger">
        Permission required
      </p>
      <h1 id="denied-state-title" className="mt-2 text-2xl font-semibold text-ink">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </section>
  );
}
