'use client';

import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { getStoredTenant, type StoredTenant } from '@/lib/auth';
import { apiFetch } from '@/lib/fetch';

type Me = {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  role: string | null;
  membershipStatus: string | null;
  visibilityScope: string | null;
  createdAt: string;
};

const roleLabels: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  CONTRACTOR: 'Contractor',
  CLIENT: 'Client',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-ink">{value || '—'}</span>
    </div>
  );
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [tenant, setTenant] = useState<StoredTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTenant(getStoredTenant());
    apiFetch<Me>('/users/me')
      .then((data) => {
        setMe(data);
        setDisplayName(data.displayName ?? '');
      })
      .catch(() => setError('Could not load profile data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await apiFetch<Me>('/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() || null }),
      });
      setMe(updated);
      setDisplayName(updated.displayName ?? '');
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Your profile and workspace details."
      />
      <div className="grid gap-4">
        {/* Profile */}
        <section className="rounded-2xl border border-line bg-panel p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Profile</h2>
            {!loading && me && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {saveSuccess && (
            <p className="mb-3 text-sm text-green-600 font-medium">Profile updated successfully.</p>
          )}

          {me && !editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" value={me.displayName ?? '(not set)'} />
              <Field label="Email" value={me.email} />
              <Field label="Role" value={roleLabels[me.role ?? ''] ?? me.role ?? '—'} />
              <Field label="Account status" value={me.membershipStatus ?? me.status} />
              <Field label="Visibility scope" value={me.visibilityScope ?? '—'} />
              <Field
                label="Member since"
                value={new Date(me.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
            </div>
          )}

          {me && editing && (
            <form onSubmit={handleSave} className="grid gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                  Display name
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={100}
                  placeholder="Your display name"
                />
              </div>
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDisplayName(me.displayName ?? '');
                    setSaveError(null);
                  }}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Workspace */}
        <section className="rounded-2xl border border-line bg-panel p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">Workspace</h2>
          {tenant ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" value={tenant.name} />
              <Field label="Slug" value={tenant.slug} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No workspace data available.</p>
          )}
          <p className="mt-4 text-xs text-slate-400">
            Workspace configuration — tenant name, allowed domains, and membership approval — is managed by the Owner.
          </p>
        </section>

        {/* Notifications */}
        <section className="rounded-2xl border border-line bg-panel p-5 shadow-card">
          <h2 className="mb-2 text-base font-semibold text-ink">Notifications</h2>
          <p className="text-sm text-slate-600">
            Notification delivery requires server-side configuration. No notification backend is active in this deployment.
          </p>
        </section>
      </div>
    </div>
  );
}
