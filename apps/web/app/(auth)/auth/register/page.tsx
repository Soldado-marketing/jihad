'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { apiBase } from '@/lib/api';

type RequestedAccountType = 'team_member' | 'client' | 'contractor' | 'other';

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  companyName: string;
  requestedAccountType: RequestedAccountType;
  tenantSlug: string;
}

const ACCOUNT_TYPE_LABELS: Record<RequestedAccountType, string> = {
  team_member: 'Team Member',
  client: 'Client',
  contractor: 'Contractor',
  other: 'Other',
};

export default function RegisterPage() {
  const reduced = useReducedMotion();
  const [form, setForm] = useState<RegisterForm>({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
    requestedAccountType: 'team_member',
    tenantSlug: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${apiBase()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          companyName: form.companyName.trim() || undefined,
          requestedAccountType: form.requestedAccountType,
          tenantSlug: form.tenantSlug.trim(),
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { message?: string | string[] };
        const raw = body.message;
        const msg = Array.isArray(raw)
          ? raw[0]
          : (raw ?? 'Registration failed. Please try again.');
        throw new Error(msg);
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Shared field animation helper ───────────────────────────────────────────
  const fieldAnim = (i: number) => ({
    initial: reduced ? false as const : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.22,
      ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
      delay: reduced ? 0 : 0.12 + i * 0.045,
    },
  });

  // ── Input class reuse ─────────────────────────────────────────────────────
  const inputCls =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[0_0_0_3px_rgba(15,98,254,0.15)]';

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <motion.div
          className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm"
          initial={reduced ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.34, 1.2, 0.64, 1] }}
        >
          <motion.div
            className="mb-4 text-4xl"
            initial={reduced ? false : { scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.34, 1.4, 0.64, 1] }}
          >
            ✅
          </motion.div>
          <motion.h1
            className="mb-2 text-xl font-semibold text-foreground"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.25 }}
          >
            Request received
          </motion.h1>
          <motion.p
            className="text-sm text-muted"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.32 }}
          >
            Your account is waiting for admin approval. You will be notified once an
            administrator reviews your request.
          </motion.p>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.4 }}
          >
            <Link
              href="/auth/login"
              className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              Back to Login
            </Link>
          </motion.div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <motion.div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm"
        initial={reduced ? false : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.0, 0.0, 0.2, 1] }}
      >
        <motion.h1
          className="mb-1 text-2xl font-semibold text-foreground"
          {...fieldAnim(0)}
        >
          Request Access
        </motion.h1>
        <motion.p className="mb-6 text-sm text-muted" {...fieldAnim(1)}>
          Submit your information. An administrator will review and approve your request.
        </motion.p>

        {/* Error banner with AnimatePresence so it slides in/out */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error-banner"
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <motion.div {...fieldAnim(2)}>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-foreground">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              id="fullName" name="fullName" type="text" required minLength={2} maxLength={100}
              value={form.fullName} onChange={handleChange} placeholder="Jane Smith"
              className={inputCls}
            />
          </motion.div>

          {/* Email */}
          <motion.div {...fieldAnim(3)}>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              id="email" name="email" type="email" required
              value={form.email} onChange={handleChange} placeholder="jane@example.com"
              className={inputCls}
            />
          </motion.div>

          {/* Password */}
          <motion.div {...fieldAnim(4)}>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
              Password <span className="text-destructive">*</span>
            </label>
            <input
              id="password" name="password" type="password" required minLength={8}
              value={form.password} onChange={handleChange} placeholder="Minimum 8 characters"
              className={inputCls}
            />
          </motion.div>

          {/* Account Type */}
          <motion.div {...fieldAnim(5)}>
            <label htmlFor="requestedAccountType" className="mb-1 block text-sm font-medium text-foreground">
              Account Type <span className="text-destructive">*</span>
            </label>
            <select
              id="requestedAccountType" name="requestedAccountType" required
              value={form.requestedAccountType} onChange={handleChange}
              className={inputCls}
            >
              {(Object.entries(ACCOUNT_TYPE_LABELS) as [RequestedAccountType, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ),
              )}
            </select>
          </motion.div>

          {/* Organization Slug */}
          <motion.div {...fieldAnim(6)}>
            <label htmlFor="tenantSlug" className="mb-1 block text-sm font-medium text-foreground">
              Organization Slug <span className="text-destructive">*</span>
            </label>
            <input
              id="tenantSlug" name="tenantSlug" type="text" required
              value={form.tenantSlug} onChange={handleChange} placeholder="your-company"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-muted">Your organization identifier (provided by your administrator)</p>
          </motion.div>

          {/* Phone (optional) */}
          <motion.div {...fieldAnim(7)}>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-foreground">
              Phone <span className="text-muted text-xs">(optional)</span>
            </label>
            <input
              id="phone" name="phone" type="tel"
              value={form.phone} onChange={handleChange} placeholder="+1 555 000 0000"
              className={inputCls}
            />
          </motion.div>

          {/* Company / Client Name (optional) */}
          <motion.div {...fieldAnim(8)}>
            <label htmlFor="companyName" className="mb-1 block text-sm font-medium text-foreground">
              Company / Client Name <span className="text-muted text-xs">(optional)</span>
            </label>
            <input
              id="companyName" name="companyName" type="text"
              value={form.companyName} onChange={handleChange} placeholder="Acme Inc."
              className={inputCls}
            />
          </motion.div>

          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            {...fieldAnim(9)}
            whileHover={reduced ? undefined : { y: -1, boxShadow: '0 4px 12px rgba(15,98,254,0.25)' }}
            whileTap={reduced ? undefined : { scale: 0.98 }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                Submitting…
              </span>
            ) : (
              'Submit Request'
            )}
          </motion.button>
        </form>

        <motion.p className="mt-6 text-center text-sm text-muted" {...fieldAnim(10)}>
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </main>
  );
}
