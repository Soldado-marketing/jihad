'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

export default function CrmPage() {
  const [counts, setCounts] = useState({ leads: 0, opps: 0, meetings: 0, followUps: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<any[]>('/leads'),
      apiFetch<any[]>('/opportunities'),
      apiFetch<any[]>('/meetings'),
      apiFetch<any[]>('/follow-ups'),
    ]).then(([l, o, m, f]) => {
      setCounts({ leads: l.length, opps: o.length, meetings: m.length, followUps: f.length });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Leads', count: counts.leads, href: '/crm/leads', color: 'bg-blue-50 border-blue-200' },
    { label: 'Opportunities', count: counts.opps, href: '/crm/opportunities', color: 'bg-green-50 border-green-200' },
    { label: 'Meetings', count: counts.meetings, href: '/crm/meetings', color: 'bg-purple-50 border-purple-200' },
    { label: 'Follow-ups', count: counts.followUps, href: '/crm/follow-ups', color: 'bg-amber-50 border-amber-200' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Customer Relations" title="CRM" description="Manage your leads, opportunities, and client relationships." />
      {loading && <p className="text-sm text-muted">Loading…</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map(c => (
          <Link key={c.href} href={c.href}
            className={`rounded-xl border p-5 hover:shadow-md transition-shadow ${c.color}`}>
            <p className="text-3xl font-bold text-ink">{c.count}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}