'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/states/error-state';

export default function CrmPage() {
  const [counts, setCounts] = useState<{ leads: number; opps: number; meetings: number; followUps: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setLoadError(null);
    Promise.all([
      apiFetch<any[]>('/leads'),
      apiFetch<any[]>('/opportunities'),
      apiFetch<any[]>('/meetings'),
      apiFetch<any[]>('/follow-ups'),
    ]).then(([l, o, m, f]) => {
      setCounts({ leads: l.length, opps: o.length, meetings: m.length, followUps: f.length });
    })
      // A failed load is not four zeros: say so and offer another try (F04).
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load the CRM numbers.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const cards = [
    { label: 'Leads', count: counts?.leads, href: '/crm/leads', color: 'bg-blue-50 border-blue-200' },
    { label: 'Opportunities', count: counts?.opps, href: '/crm/opportunities', color: 'bg-green-50 border-green-200' },
    { label: 'Meetings', count: counts?.meetings, href: '/crm/meetings', color: 'bg-purple-50 border-purple-200' },
    { label: 'Follow-ups', count: counts?.followUps, href: '/crm/follow-ups', color: 'bg-amber-50 border-amber-200' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Customer Relations" title="CRM" description="Manage your leads, opportunities, and client relationships." />
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {loadError && <ErrorState title="The CRM numbers could not be loaded" message={loadError} onRetry={load} />}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map(c => (
          <Link key={c.href} href={c.href}
            className={`rounded-xl border p-5 hover:shadow-md transition-shadow ${c.color}`}>
            <p className="text-3xl font-bold text-ink">{c.count ?? '—'}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}