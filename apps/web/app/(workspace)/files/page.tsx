'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type FileAsset = {
  id: string;
  name: string;
  mimeType?: string;
  versionCount?: number;
  visibility?: string;
  createdAt: string;
  project?: { name: string };
};
type Option = { id: string; name?: string; title?: string };

export default function FilesPage() {
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [tasks, setTasks] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', projectId: '', taskId: '' });

  useEffect(() => {
    load();
    // Attachment targets are optional, so a failure here must not block the page.
    apiFetch<Option[]>('/projects').then(setProjects).catch(() => setProjects([]));
    apiFetch<Option[]>('/tasks').then(setTasks).catch(() => setTasks([]));
  }, []);

  async function load() {
    try {
      setFiles(await apiFetch<FileAsset[]>('/files'));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>('/files', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          ...(form.projectId ? { projectId: form.projectId } : {}),
          ...(form.taskId ? { taskId: form.taskId } : {}),
        }),
      });
      setForm({ name: '', projectId: '', taskId: '' });
      setShowForm(false);
      await load();
      // Straight to the detail page, which is where the bytes get uploaded.
      if (created?.id) window.location.assign(`/files/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register the file.');
    }
  }

  async function deleteFile(id: string) {
    if (!confirm('Delete this file?')) return;
    try {
      await apiFetch(`/files/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the file.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Files"
        description="Register a file, then open it to upload versions."
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            + Register File
          </button>
        }
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-line bg-white p-4"
        >
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="File name"
            required
            minLength={2}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Attach to project (optional)
              </span>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Attach to task (optional)
              </span>
              <select
                value={form.taskId}
                onChange={(e) => setForm({ ...form, taskId: e.target.value })}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              >
                <option value="">No task</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title ?? t.name ?? t.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 text-sm text-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {!loading && files.length === 0 && (
        <p className="py-8 text-center text-sm text-muted">No files yet.</p>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
            <Link href={`/files/${f.id}`} className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{f.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {f.mimeType ?? 'No content yet'} · {f.versionCount ?? 0} version
                {(f.versionCount ?? 0) === 1 ? '' : 's'} · {f.project?.name ?? 'No project'} ·{' '}
                {new Date(f.createdAt).toLocaleDateString()}
              </p>
            </Link>
            <button
              onClick={() => deleteFile(f.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
