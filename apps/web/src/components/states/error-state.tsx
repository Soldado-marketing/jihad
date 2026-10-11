'use client';

/**
 * A failed load or action (MAOS-T61). Announced to assistive technology
 * (role="alert"), with an optional retry. The message should be safe to show:
 * pass the API's user-facing message, never a stack or raw response.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <section role="alert" className="rounded-2xl border border-danger/25 bg-danger/5 p-5">
      <h2 className="text-sm font-semibold text-danger">{title}</h2>
      {message && <p className="mt-1 text-sm text-slate-700">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Try again
        </button>
      )}
    </section>
  );
}
