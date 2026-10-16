'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

// T74: totalCostCents includes the labour stored on time entries; unratedMinutes have no rate yet.
type Summary = {
  totalRevenueCents: number;
  totalCostCents: number;
  totalInvoicedCents: number;
  totalPaidCents: number;
  currency: string;
  recordedCostCents?: number;
  labourCostCents?: number;
  unratedMinutes?: number;
  incomplete?: boolean;
};

function fmt(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default function FinancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Summary>('/finance/summary').then(setSummary).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const cards = summary ? [
    { label: 'Total Revenue', value: fmt(summary.totalRevenueCents, summary.currency), color: 'text-green-600' },
    {
      label: summary.labourCostCents ? `Total Costs (incl. labour ${fmt(summary.labourCostCents, summary.currency)})` : 'Total Costs',
      value: `${summary.incomplete ? '≥ ' : ''}${fmt(summary.totalCostCents, summary.currency)}`,
      color: 'text-red-500',
    },
    { label: 'Invoiced', value: fmt(summary.totalInvoicedCents, summary.currency), color: 'text-blue-600' },
    { label: 'Collected', value: fmt(summary.totalPaidCents, summary.currency), color: 'text-emerald-600' },
  ] : [];

  const links = [
    { label: 'Invoices', href: '/finance/invoices', desc: 'View and create invoices' },
    { label: 'Payments', href: '/finance/payments', desc: 'Track payment records' },
    { label: 'Revenue', href: '/finance/revenue', desc: 'Revenue records' },
    { label: 'Costs', href: '/finance/costs', desc: 'Cost records' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finance" title="Financial Overview" description="Aggregated financial position across all projects." />
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {summary?.incomplete && (
        <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {Math.floor((summary.unratedMinutes ?? 0) / 60)}:{String((summary.unratedMinutes ?? 0) % 60).padStart(2, '0')} h of logged time have no rate yet, so total costs are a minimum.
          Set rates and re-rate the period to complete them.
        </p>
      )}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {cards.map(c => (
            <div key={c.label} className="rounded-xl border border-line bg-white p-5">
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="mt-1 text-sm text-muted">{c.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className="rounded-xl border border-line bg-white p-5 hover:shadow-md transition-shadow">
            <p className="font-semibold text-ink">{l.label}</p>
            <p className="text-sm text-muted mt-1">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}