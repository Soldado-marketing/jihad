import type { Metadata } from 'next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEnv, getReadinessSnapshot } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Settings | SH Investments Workflow',
  description: 'Environment-backed configuration summary for the SH Investments internal workflow.',
};

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const env = getEnv();
  const readiness = getReadinessSnapshot();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
          Configuration summary
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-navy sm:text-4xl">
            Environment-backed settings
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-brand-navy/68">
            This workflow keeps credentials in environment variables only. The dashboard shows readiness and selected
            operating modes without exposing secrets.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ConfigCard
          title="Workflow mode"
          description="This system is locked to SH Investments and prepares assets for manual publishing only."
          rows={[
            ['Reviewer email', env.REVIEWER_EMAIL || 'Not configured'],
            ['Content provider', readiness.content ? 'Configured or mock mode' : 'Missing'],
            ['Storage driver', readiness.storageDriver],
            ['Manual publishing', 'Enabled only'],
          ]}
        />
        <ConfigCard
          title="Email transport"
          description="SMTP is used for review delivery. IMAP is optional but required for inbox monitoring."
          rows={[
            ['SMTP', readiness.smtp ? 'Configured' : 'Missing'],
            ['IMAP', readiness.imap ? 'Configured' : 'Missing'],
            ['SMTP from', env.SMTP_FROM_EMAIL || 'Not configured'],
            ['Inbox mailbox', env.IMAP_MAILBOX || 'INBOX'],
          ]}
        />
        <ConfigCard
          title="Storage"
          description="Cloud storage is supported through an S3-compatible bucket. Local storage remains available for local testing."
          rows={[
            ['Driver', readiness.storageDriver],
            ['Bucket', env.STORAGE_BUCKET || 'Not configured'],
            ['Region', env.STORAGE_REGION || 'Not configured'],
            ['Endpoint', env.STORAGE_ENDPOINT || 'Provider default'],
          ]}
        />
        <ConfigCard
          title="Runtime paths"
          description="These settings affect generated review links, database location, and scheduled inbox sync."
          rows={[
            ['Base URL', env.APP_BASE_URL || 'http://localhost:3000'],
            ['Database file', env.DATABASE_FILE || './data/sh-investments.sqlite'],
            ['Scheduler secret', readiness.scheduler ? 'Configured' : 'Missing'],
            ['Arabic font override', env.SH_ARABIC_FONT_FILE || 'Fallback font active'],
          ]}
        />
      </div>
    </div>
  );
}

function ConfigCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<[string, string]>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 rounded-2xl border border-brand-navy/10 bg-brand-cream/20 px-4 py-3"
          >
            <span className="text-sm text-brand-navy">{label}</span>
            <span className="text-sm font-semibold text-brand-navy">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
