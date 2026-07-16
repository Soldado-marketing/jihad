'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type FileAsset = { id: string; name: string; mimeType?: string; status: string; createdAt: string; project?: { name: string } };

export default function FilesPage() {
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    try { setFiles(await apiFetch<FileAsset[]>('/files')); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/files', { method: 'POST', body: JSON.stringify({ name }) });
      setName(''); setShowForm(false); load();
    } catch (e: any) { alert(e.message); }
  }

  async function deleteFile(id: string) {
    if (!confirm('Delete this file?')) return;
    try { await apiFetch(`/files/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Files" description="Manage shared file assets."
        actions={<button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ Register File</button>}
      />
      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="File name" required className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Register</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 text-sm text-muted">Cancel</button>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {!loading && files.length === 0 && <p className="text-center text-sm text-muted py-8">No files yet.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line bg-white overflow-hidden">
        {files.map(f => (
          <li key={f.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
            <div>
              <p className="text-sm font-medium text-ink">{f.name}</p>
              <p className="text-xs text-muted mt-0.5">{f.mimeType ?? 'Unknown type'} · {f.project?.name ?? 'No project'} · {new Date(f.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={() => deleteFile(f.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}