'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { loginAction, type LoginActionState } from '@/app/login/actions';
import { Button } from '@/components/ui/button';

const initialState: LoginActionState = {
  error: null,
};

type LoginFormProps = {
  demoUsername: string;
  demoPassword: string;
};

export function LoginForm({ demoUsername, demoPassword }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-soft backdrop-blur-xl sm:p-8">
      <div className="mb-8 space-y-3">
        <div className="inline-flex rounded-full border border-brand-sand/40 bg-brand-sand/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-sand">
          Internal access
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-4xl text-brand-white">Dashboard login</h2>
          <p className="text-sm leading-6 text-brand-white/70">
            Sign in to manage weekly SH Investments social posts, reviewer approvals, and export packages.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-white/60"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            defaultValue={demoUsername}
            className="h-12 w-full rounded-2xl border border-white/12 bg-brand-deep/75 px-4 text-sm text-brand-white outline-none transition-colors placeholder:text-brand-white/40 focus:border-brand-sand"
            placeholder="Enter your username"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-white/60"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            defaultValue={demoPassword}
            className="h-12 w-full rounded-2xl border border-white/12 bg-brand-deep/75 px-4 text-sm text-brand-white outline-none transition-colors placeholder:text-brand-white/40 focus:border-brand-sand"
            placeholder="Enter your password"
          />
        </div>

        {state.error ? (
          <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {state.error}
          </div>
        ) : null}

        <SubmitButton />
      </form>

      <div className="mt-6 rounded-2xl border border-white/10 bg-brand-deep/40 p-4 text-sm text-brand-white/75">
        <p className="font-semibold text-brand-white">Configured credentials</p>
        <p className="mt-2">
          Username: <span className="font-mono text-brand-sand">{demoUsername}</span>
        </p>
        <p className="mt-1">
          Password: <span className="font-mono text-brand-sand">{demoPassword}</span>
        </p>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" isLoading={pending}>
      Sign in
    </Button>
  );
}
