'use client';
import { Suspense, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { DataTable } from '@/components/ui/data-table';
import { FilterBar, useUrlFilters, type FilterBarField } from '@/components/ui/filter-bar';
import { applyFilters } from '@/lib/filters';
import { PageHeader } from '@/components/ui/page-header';

type Lead = { id: string; name: string; status: string; email?: string; company?: string };

const LEAD_FILTERS: FilterBarField[] = [
  {
    key: 'status',
    label: 'Status',
    options: ['LEAD', 'CONTACTED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'],
    optionLabel: (v) => v.charAt(0) + v.slice(1).toLowerCase(),
  },
];

// useSearchParams (the URL-held filters) needs a Suspense boundary.
export default function LeadsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <LeadsList />
    </Suspense>
  );
}

function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const filters = useUrlFilters(LEAD_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '' });

  useEffect(() => { load(); }, []);
  async function load() {
    try { setLeads(await apiFetch<Lead[]>('/leads')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/leads', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', email: '', company: '' }); setShowForm(false); load();
    } catch (e: any) { alert(e.message); }
  }

  async function deleteLead(id: string) {
    if (!confirm('Delete this lead?')) return;
    try { await apiFetch(`/leads/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  }

  const visible = applyFilters(leads, filters, (l, key) => (l as Record<string, string | undefined>)[key], ['name', 'email', 'company']);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="CRM" title="Leads" description="Manage incoming leads and prospects."
        actions={<button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ New Lead</button>}
      />
      {showForm && (
        <form onSubmit={handleCreate} className="grid grid-cols-3 gap-3 rounded-xl border border-line bg-white p-4">
          {(['name','email','company'] as const).map(f => (
            <input key={f} value={form[f]} onChange={e => setForm(p => ({...p, [f]: e.target.value}))}
              placeholder={f.charAt(0).toUpperCase()+f.slice(1)} required={f==='name'}
              className="rounded-lg border border-line px-3 py-2 text-sm" />
          ))}
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white col-span-2">Create</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-muted">Cancel</button>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && leads.length === 0 && !error && <p className="text-sm text-muted text-center py-8">No leads yet.</p>}
      {leads.length > 0 && <FilterBar fields={LEAD_FILTERS} placeholder="Search name, email or company" />}
      {leads.length > 0 && visible.length === 0 && <p className="text-sm text-muted text-center py-8">No leads match these filters.</p>}
      {visible.length > 0 && (
        <DataTable
          label="Leads"
          rows={visible}
          rowKey={(l) => l.id}
          initialSort={{ key: 'name', direction: 'asc' }}
          columns={[
            { key: 'name', header: 'Name', sortValue: (l) => l.name, render: (l) => <span className="font-medium text-ink">{l.name}</span> },
            { key: 'email', header: 'Email', sortValue: (l) => l.email, render: (l) => <span className="text-muted">{l.email || '—'}</span> },
            { key: 'company', header: 'Company', sortValue: (l) => l.company, render: (l) => <span className="text-muted">{l.company || '—'}</span> },
            {
              key: 'status',
              header: 'Status',
              sortValue: (l) => l.status,
              render: (l) => <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{l.status}</span>,
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (l) => (
                <button onClick={() => deleteLead(l.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}