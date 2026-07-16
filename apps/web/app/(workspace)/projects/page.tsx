'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type Project = { id: string; name: string; status: string; _count?: { tasks: number } };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    try { setProjects(await apiFetch<Project[]>('/projects')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await apiFetch('/projects', { method: 'POST', body: JSON.stringify({ name }) });
      setName(''); setCreating(false); load();
    } catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Project delivery" title="Projects"
        description="Track active delivery work and client-visible project boundaries."
        actions={<button onClick={() => setCreating(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90">
          + New Project
        </button>}
      />
      {creating && (
        <form onSubmit={handleCreate} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name"
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Create</button>
          <button type="button" onClick={() => setCreating(false)} className="px-3 py-2 text-sm text-muted">Cancel</button>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">No projects yet. Create your first one above.</p>
      )}
      {projects.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
          {projects.map(p => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`}
                className="flex items-center justify-between p-5 hover:bg-slate-50">
                <div>
                  <p className="font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-muted mt-0.5">{p.status}</p>
                </div>
                <span className="text-xs text-muted">{p._count?.tasks ?? 0} tasks →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}