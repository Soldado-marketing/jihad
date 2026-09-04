'use client';

/**
 * App Router global error boundary (the /500 equivalent).
 *
 * Like not-found.tsx, this exists so Next does not fall back to the built-in
 * pages-router error page, which imports <Html> and fails the production build.
 * A global-error boundary replaces the root layout, so it must render its own
 * <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Error</p>
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-slate-600">
            The page could not be displayed. Try again, and if it keeps happening quote reference{' '}
            {error.digest ?? 'n/a'}.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
