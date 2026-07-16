'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { setAuthSession } from '@/lib/auth';
import { apiBase } from '@/lib/api';

// ── Response shape from POST /api/auth/login ──────────────────────────────────
interface LoginResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

interface ApiErrorBody {
  message?: string | string[];
  statusCode?: number;
}

export default function LoginPage() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const [email, setEmail] = useState('');
  const [passwordOrMagicCode, setPasswordOrMagicCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${apiBase()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // DTO: { email, passwordOrMagicCode } — do NOT use `password`
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          passwordOrMagicCode,
        }),
      });

      if (res.status === 401) {
        throw new Error('Invalid email or password.');
      }
      if (res.status === 403) {
        const body = (await res.json()) as ApiErrorBody;
        const raw = body.message;
        const msg = Array.isArray(raw)
          ? raw[0]
          : (raw ?? 'Access denied. Contact your administrator.');
        throw new Error(msg);
      }

      if (!res.ok) {
        const body = (await res.json()) as ApiErrorBody;
        const raw = body.message;
        const msg = Array.isArray(raw)
          ? raw[0]
          : (raw ?? 'Login failed. Please try again.');
        throw new Error(msg);
      }

      const data = (await res.json()) as LoginResponse;

      // Store session — tokens never logged to console
      setAuthSession({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        user: {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          role: data.user.role,
        },
        tenant: {
          id: data.tenant.id,
          name: data.tenant.name,
          slug: data.tenant.slug,
        },
      });

      // All roles land on /dashboard for now; workspace layout handles role gating
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Shared field animation helper (mirrors register page) ─────────────────
  const fieldAnim = (i: number) => ({
    initial: reduced ? (false as const) : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.22,
      ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
      delay: reduced ? 0 : 0.12 + i * 0.05,
    },
  });

  const inputCls =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[0_0_0_3px_rgba(15,98,254,0.15)]';

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <motion.div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm"
        initial={reduced ? false : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.0, 0.0, 0.2, 1] }}
      >
        {/* Heading */}
        <motion.h1
          className="mb-1 text-2xl font-semibold text-foreground"
          {...fieldAnim(0)}
        >
          Sign in
        </motion.h1>
        <motion.p className="mb-6 text-sm text-muted" {...fieldAnim(1)}>
          Enter your credentials to access your workspace.
        </motion.p>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error-banner"
              role="alert"
              className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <motion.div {...fieldAnim(2)}>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Email <span className="text-destructive">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              className={inputCls}
            />
          </motion.div>

          {/* Password — label says "Password", field name matches DTO */}
          <motion.div {...fieldAnim(3)}>
            <label
              htmlFor="passwordOrMagicCode"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Password <span className="text-destructive">*</span>
            </label>
            <input
              id="passwordOrMagicCode"
              name="passwordOrMagicCode"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              value={passwordOrMagicCode}
              onChange={(e) => {
                setPasswordOrMagicCode(e.target.value);
                setError(null);
              }}
              placeholder="Minimum 8 characters"
              className={inputCls}
            />
          </motion.div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            {...fieldAnim(4)}
            whileHover={
              reduced ? undefined : { y: -1, boxShadow: '0 4px 12px rgba(15,98,254,0.25)' }
            }
            whileTap={reduced ? undefined : { scale: 0.98 }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </motion.button>
        </form>

        <motion.p
          className="mt-6 text-center text-sm text-muted"
          {...fieldAnim(5)}
        >
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/register"
            className="text-primary underline-offset-4 hover:underline"
          >
            Request access
          </Link>
        </motion.p>
      </motion.div>
    </main>
  );
}
