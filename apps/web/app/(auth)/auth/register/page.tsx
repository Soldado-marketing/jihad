import Link from 'next/link';

/** Public self-registration is disabled. Existing invite URLs use /auth/invite. */
export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <h1 className="text-2xl font-semibold text-ink">Access by invitation only</h1>
        <p className="mt-3 text-sm text-slate-600">
          MAOS is a private workspace. Ask your company owner to send you an invitation.
          If you already have an account, sign in normally.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
