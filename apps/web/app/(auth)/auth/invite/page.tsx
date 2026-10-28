'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { UnauthorizedState } from '@/components/states/unauthorized-state';
import { apiBase } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { acceptFormError, INVALID_INVITE_MESSAGE, INVITE_ROLES, isInviteToken } from '@/lib/invites';

/**
 * Accept an invitation (MAOS F-2). The emailed link carries a single-use
 * token; this page shows who invited the person into which role, then sets
 * their name and password. Every unusable link gets the same message.
 */
export default function InvitePage() {
  // useSearchParams needs a Suspense boundary.
  return (
    <Suspense fallback={<Shell><p className="text-sm text-muted">Checking your invitation…</p></Shell>}>
      <AcceptInvite />
    </Suspense>
  );
}

interface Preview {
  email: string;
  role: string;
  tenantName: string;
  expiresAt: string;
  customerName?: string;
  accountExists: boolean;
}

type Phase = 'checking' | 'invalid' | 'ready' | 'done';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 shadow-sm">{children}</div>
    </main>
  );
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const raw = body.message;
    return Array.isArray(raw) ? raw[0] : (raw ?? fallback);
  } catch {
    return fallback;
  }
}

function AcceptInvite() {
  const params = useSearchParams();
  const [token] = useState(() => params.get('token'));
  const [phase, setPhase] = useState<Phase>('checking');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [form, setForm] = useState({ fullName: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newTenantSlug, setNewTenantSlug] = useState<string | null>(null);

  useEffect(() => {
    // The token is the credential: keep it out of the address bar and history.
    window.history.replaceState(null, '', '/auth/invite');
    if (!isInviteToken(token)) {
      setPhase('invalid');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${apiBase()}/auth/invites/preview?token=${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error('invalid');
        const body = (await res.json()) as Preview;
        if (!cancelled) {
          setPreview(body);
          setPhase('ready');
        }
      } catch {
        if (!cancelled) setPhase('invalid');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = acceptFormError(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/auth/invites/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fullName: form.fullName.trim(), password: form.password }),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const text = await res.text();
          if (text.includes('INVITE_INVALID')) {
            setPhase('invalid');
            return;
          }
          setError('Please check your details and try again.');
          return;
        }
        if (res.status === 429) {
          setError('Too many attempts. Wait a minute and try again.');
          return;
        }
        setError(await errorMessage(res, 'The invitation could not be accepted. Please try again.'));
        return;
      }
      const result = (await res.json()) as { tenantSlug: string };
      setNewTenantSlug(result.tenantSlug);
      setPhase('done');
    } catch {
      setError('The server could not be reached. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // A pre-existing account must authenticate on its ORIGINAL tenant before
  // accepting. The invite token stays only in this tab's in-memory state.
  // Opening login in another tab avoids putting the invite secret in a URL.
  const handleExistingAccept = async () => {
    const access = getAccessToken();
    const actor = getStoredUser();
    if (!access || actor?.email?.toLowerCase() !== preview?.email.toLowerCase()) {
      setError('Sign in to the invited email in another tab, then return here.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/auth/invites/accept-existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const message = await res.text();
          if (message.includes('INVITE_INVALID')) {
            setPhase('invalid');
            return;
          }
        }
        setError(res.status === 401 || res.status === 403
          ? 'Sign in with the invited email, then try again.'
          : await errorMessage(res, 'Could not accept invitation. Please try again.'));
        return;
      }
      const result = (await res.json()) as { tenantSlug: string };
      setNewTenantSlug(result.tenantSlug);
      setPhase('done');
    } catch {
      setError('The server could not be reached. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent';

  if (phase === 'invalid') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <UnauthorizedState title="Invalid or expired invite link" description={INVALID_INVITE_MESSAGE} />
      </main>
    );
  }

  if (phase === 'checking' || !preview) {
    return (
      <Shell>
        <p className="text-sm text-muted">Checking your invitation…</p>
      </Shell>
    );
  }

  if (phase === 'done') {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-semibold text-ink">You are in</h1>
        <p className="text-sm text-muted">
          {preview.accountExists
            ? `Your existing account has been added to ${preview.tenantName}. Sign in with the same password and select this company.`
            : `Your account for ${preview.tenantName} is ready. Sign in with ${preview.email} and the password you just set.`}
        </p>
        <Link
          href={newTenantSlug ? `/auth/login?tenant=${encodeURIComponent(newTenantSlug)}` : '/auth/login'}
          className="mt-6 inline-block text-sm text-accent underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </Shell>
    );
  }

  const roleLabel = INVITE_ROLES.find((r) => r.value === preview.role)?.label ?? preview.role;
  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-semibold text-ink">Join {preview.tenantName}</h1>
      <p className="mb-6 text-sm text-muted">
        You were invited as <strong>{roleLabel}</strong>
        {preview.customerName ? <> for <strong>{preview.customerName}</strong></> : null} with {preview.email}. The link works once and expires{' '}
        {new Date(preview.expiresAt).toLocaleString()}.
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {preview.accountExists ? (
        <section className="space-y-4">
          <p className="text-sm text-muted">
            You already have a MAOS account. Keep your existing password.
            First sign in with {preview.email} in a separate tab, then return here
            to accept this invitation.
          </p>
          <Link
            href="/auth/login" target="_blank" rel="noopener noreferrer"
            className="block rounded-lg border border-line px-4 py-2 text-center text-sm font-medium"
          >
            Sign in to your existing account
          </Link>
          <button type="button" onClick={() => void handleExistingAccept()} disabled={busy}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Joining workspace…' : 'Accept with my signed-in account'}
          </button>
        </section>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-ink">
            Full name
          </label>
          <input
            id="fullName" type="text" required minLength={2} maxLength={100} autoComplete="name"
            value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Minimum 8 characters" className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-ink">
            Confirm password
          </label>
          <input
            id="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password"
            value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
        >
          {busy ? 'Creating your account…' : 'Accept invitation'}
        </button>
      </form>
      )}
    </Shell>
  );
}
