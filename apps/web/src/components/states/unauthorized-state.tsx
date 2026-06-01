type UnauthorizedStateProps = {
  title?: string;
  description?: string;
};

export function UnauthorizedState({
  title = 'Sign in required',
  description = 'Use an approved invitation and active session to access MAOS.',
}: UnauthorizedStateProps) {
  return (
    <section
      aria-labelledby="unauthorized-state-title"
      className="rounded-md border border-line bg-panel p-6 shadow-shell"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-warning">
        Unauthorized
      </p>
      <h1 id="unauthorized-state-title" className="mt-2 text-2xl font-semibold text-ink">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </section>
  );
}
