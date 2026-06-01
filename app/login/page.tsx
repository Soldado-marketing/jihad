import type { Metadata } from 'next';

import { LoginForm } from '@/components/auth/login-form';
import { getConfiguredCredentials } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Login | SH Investments Workflow',
  description: 'Secure login for the SH Investments internal social media workflow dashboard.',
};

export default function LoginPage() {
  const credentials = getConfiguredCredentials();

  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-deep text-brand-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,202,141,0.22),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(220,175,115,0.12),_transparent_26%),linear-gradient(180deg,_#070f26_0%,_#111632_48%,_#070f26_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(252,252,252,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(252,252,252,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-10">
        <section className="mb-10 max-w-2xl space-y-6 lg:mb-0 lg:flex-1">
          <div className="inline-flex items-center rounded-full border border-brand-sand/30 bg-brand-sand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-sand">
            SH Investments only
          </div>
          <div className="space-y-4">
            <h1 className="max-w-xl font-display text-5xl leading-tight text-brand-white sm:text-6xl">
              Bilingual post workflow with review and manual publishing packages.
            </h1>
            <p className="max-w-xl text-base leading-7 text-brand-white/74">
              Intake weekly topics by email, generate Arabic and German assets with one design system, collect reviewer feedback, and stop at READY FOR MANUAL PUBLISHING.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureCard
              title="Email intake"
              description="Import weekly topics from the inbox when IMAP is configured."
            />
            <FeatureCard
              title="Design system"
              description="Generate reusable 1080×1350 bilingual PNGs with SH Investments branding."
            />
            <FeatureCard
              title="Manual publish"
              description="Prepare a final package for Instagram, Facebook, and TikTok without auto-posting."
            />
          </div>
        </section>

        <section className="w-full max-w-md">
          <LoginForm
            demoUsername={credentials.username}
            demoPassword={credentials.password}
          />
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-soft backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-sand">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-brand-white/72">{description}</p>
    </div>
  );
}
