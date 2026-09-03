'use client';

import { useEffect, useState } from 'react';
import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';
import { PageHeader } from '@/components/ui/page-header';
import { apiBlob, apiFetch, saveBlob } from '@/lib/fetch';

type ClientFileVersion = {
  id: string;
  versionNumber: number;
  originalName?: string;
  sizeBytes?: number;
};

type ClientFile = {
  id: string;
  name: string;
  mimeType?: string;
  project?: { id: string; name: string };
  versions: ClientFileVersion[];
};

const PREVIEWABLE = /\.(png|jpe?g|gif|webp|pdf)$/i;

export default function ClientFilesPage() {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ClientFile[]>('/client/files')
      .then(setFiles)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load your files.'),
      )
      .finally(() => setLoading(false));
  }, []);

  async function open(
    file: ClientFile,
    version: ClientFileVersion,
    mode: 'inline' | 'attachment',
  ) {
    setBusy(version.id);
    setError(null);
    try {
      const { blob, filename } = await apiBlob(
        `/client/files/${file.id}/versions/${version.id}/content?disposition=${mode}`,
        version.originalName ?? file.name,
      );
      if (mode === 'attachment') {
        saveBlob(blob, filename);
        return;
      }
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, '_blank');
      // A blocked popup would otherwise look like nothing happened.
      if (!opened) saveBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that file.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Client workspace"
        title="Files"
        description="Files your team has shared with you. Only approved versions appear here."
      />
      <ClientSafeNotice />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && files.length === 0 && !error && (
        <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
          Nothing has been shared with you yet.
        </p>
      )}
      <ul className="grid gap-4">
        {files.map((file) => (
          <li key={file.id} className="rounded-xl border border-line bg-white p-5">
            <p className="font-medium text-ink">{file.name}</p>
            <p className="mt-0.5 text-xs text-muted">{file.project?.name ?? 'No project'}</p>
            <ul className="mt-3 divide-y divide-line border-t border-line">
              {file.versions.map((version) => {
                const name = version.originalName ?? file.name;
                return (
                  <li key={version.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm text-slate-700">
                      Version {version.versionNumber} · {name}
                      {version.sizeBytes !== undefined && ` · ${version.sizeBytes} B`}
                    </span>
                    <span className="flex gap-2">
                      {PREVIEWABLE.test(name) && (
                        <button
                          type="button"
                          disabled={busy === version.id}
                          onClick={() => open(file, version, 'inline')}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs"
                        >
                          Preview
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy === version.id}
                        onClick={() => open(file, version, 'attachment')}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Download
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
