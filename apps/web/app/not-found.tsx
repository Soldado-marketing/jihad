import Link from 'next/link';

/**
 * App Router 404.
 *
 * Without this file Next falls back to the built-in pages-router error page,
 * which imports <Html> and fails the production build with
 * "should not be imported outside of pages/_document".
 *
 * Deliberately a plain server component: no framer-motion, no client hooks, so
 * it renders in any pass.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">404</p>
      <h1 className="text-2xl font-semibold text-ink">Page not found</h1>
      <p className="text-sm text-slate-600">
        The page you asked for does not exist, or you do not have access to it.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
