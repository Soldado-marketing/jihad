'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { FilterBar, useUrlFilters, type FilterBarField } from '@/components/ui/filter-bar';
import { PageHeader } from '@/components/ui/page-header';
import { getStoredUser } from '@/lib/auth';
import {
  canWriteCustomers,
  createPayload,
  CUSTOMER_STATUSES,
  customerField,
  industryOptions,
  STATUS_LABEL,
  statusChoices,
  updatePayload,
  type CustomerRow,
  type CustomerStatus,
} from '@/lib/customers';
import { apiFetch } from '@/lib/fetch';
import { applyFilters } from '@/lib/filters';

/**
 * Customers (MAOS-T53, ADR-017): the business entity behind a client key.
 * OWNER and MANAGER create and edit; EMPLOYEE reads; archiving is OWNER only.
 * The API enforces all of it; this page only avoids offering refused actions.
 */
export default function CustomersPage() {
  // useSearchParams (the URL-held filters) needs a Suspense boundary.
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <CustomersList />
    </Suspense>
  );
}

const STATUS_BADGE: Record<CustomerStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
  ARCHIVED: 'bg-amber-100 text-amber-800',
};

const emptyForm = { name: '', clientScopeKey: '', industry: '', website: '', notes: '' };
const inputCls = 'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent';

function CustomersList() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [edit, setEdit] = useState({ name: '', industry: '', website: '', notes: '', status: 'ACTIVE' as CustomerStatus });
  const [editError, setEditError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await apiFetch<CustomerRow[]>('/customers'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRole(getStoredUser()?.role);
    void load();
  }, [load]);

  const fields: FilterBarField[] = useMemo(
    () => [
      { key: 'status', label: 'Status', options: [...CUSTOMER_STATUSES], optionLabel: (v) => STATUS_LABEL[v as CustomerStatus] ?? v },
      { key: 'industry', label: 'Industry', options: industryOptions(rows) },
    ],
    [rows],
  );
  const filters = useUrlFilters(fields);
  const visible = applyFilters(rows, filters, customerField, ['name', 'clientScopeKey', 'industry']);
  const writer = canWriteCustomers(role);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const payload = createPayload(form);
    if (!payload.ok) {
      setFormError(payload.error);
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      await apiFetch('/customers', { method: 'POST', body: JSON.stringify(payload.body) });
      setForm(emptyForm);
      setShowCreate(false);
      void load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'The customer could not be created.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c: CustomerRow) {
    setEditing(c);
    setEditError('');
    setEdit({ name: c.name, industry: c.industry ?? '', website: c.website ?? '', notes: c.notes ?? '', status: c.status });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = updatePayload(editing, edit);
    if (!payload.ok) {
      setEditError(payload.error);
      return;
    }
    if (Object.keys(payload.body).length === 0) {
      setEditing(null);
      return;
    }
    setBusy(true);
    setEditError('');
    try {
      await apiFetch(`/customers/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload.body) });
      setEditing(null);
      void load();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'The customer could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Customers"
        description="Every client as one record: projects, invoices and files point at it through its client key."
        actions={
          writer ? (
            <button onClick={() => setShowCreate((v) => !v)} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
              + New customer
            </button>
          ) : undefined
        }
      />

      {writer && showCreate && (
        <form onSubmit={handleCreate} className="grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" required maxLength={200} className={inputCls} />
          <div className="flex flex-col gap-1">
            <input value={form.clientScopeKey} onChange={(e) => setForm({ ...form, clientScopeKey: e.target.value })} placeholder="Client key (e.g. acme)" required maxLength={120} className={inputCls} />
            <span className="text-xs text-muted">Set once; it links records and client logins to this customer and cannot be changed later.</span>
          </div>
          <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Industry (optional)" maxLength={120} className={inputCls} />
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://website (optional)" maxLength={300} className={inputCls} />
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional, internal)" maxLength={5000} className={`${inputCls} sm:col-span-2`} rows={2} />
          {formError && <p role="alert" className="text-sm text-danger sm:col-span-2">{formError}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm text-muted">Cancel</button>
          </div>
        </form>
      )}

      {editing && (
        <form onSubmit={handleSave} className="grid gap-3 rounded-xl border border-accent/40 bg-white p-4 sm:grid-cols-2">
          <p className="text-sm font-semibold text-ink sm:col-span-2">
            Edit {editing.name} <span className="font-normal text-muted">· key {editing.clientScopeKey} (fixed)</span>
          </p>
          <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required maxLength={200} className={inputCls} aria-label="Name" />
          <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as CustomerStatus })} className={inputCls} aria-label="Status">
            {statusChoices(role, editing.status).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <input value={edit.industry} onChange={(e) => setEdit({ ...edit, industry: e.target.value })} placeholder="Industry" maxLength={120} className={inputCls} aria-label="Industry" />
          <input value={edit.website} onChange={(e) => setEdit({ ...edit, website: e.target.value })} placeholder="https://website" maxLength={300} className={inputCls} aria-label="Website" />
          <textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="Notes" maxLength={5000} className={`${inputCls} sm:col-span-2`} rows={2} aria-label="Notes" />
          {editError && <p role="alert" className="text-sm text-danger sm:col-span-2">{editError}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 text-sm text-muted">Cancel</button>
          </div>
        </form>
      )}

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="py-8 text-center text-sm text-muted">No customers yet.{writer ? ' Create the first one above.' : ''}</p>
      )}
      {rows.length > 0 && <FilterBar fields={fields} placeholder="Search name, key or industry" />}
      {rows.length > 0 && visible.length === 0 && <p className="py-8 text-center text-sm text-muted">No customers match these filters.</p>}
      {visible.length > 0 && (
        <DataTable
          label="Customers"
          rows={visible}
          rowKey={(c) => c.id}
          initialSort={{ key: 'name', direction: 'asc' }}
          columns={[
            { key: 'name', header: 'Name', sortValue: (c) => c.name, render: (c) => <span className="font-medium text-ink">{c.name}</span> },
            { key: 'key', header: 'Client key', sortValue: (c) => c.clientScopeKey, render: (c) => <code className="text-xs text-muted">{c.clientScopeKey}</code> },
            { key: 'industry', header: 'Industry', sortValue: (c) => c.industry ?? '', render: (c) => <span className="text-muted">{c.industry || '—'}</span> },
            {
              key: 'work',
              header: 'Projects · Invoices · Files',
              sortValue: (c) => c._count.projects,
              render: (c) => <span className="tabular-nums text-muted">{c._count.projects} · {c._count.invoices} · {c._count.fileAssets}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              sortValue: (c) => c.status,
              render: (c) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}>{STATUS_LABEL[c.status]}</span>,
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (c) => (writer ? <button onClick={() => startEdit(c)} className="text-xs text-accent hover:underline">Edit</button> : null),
            },
          ]}
        />
      )}
    </div>
  );
}
