'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { FileDetail } from '@/components/files/file-detail';
import { type FileVisibility } from '@/components/files/file-visibility-badge';
import { type FileVersionListItem } from '@/components/files/file-version-list';
import { ErrorState } from '@/components/states/error-state';
import { apiFetch } from '@/lib/fetch';

type RawFile = {
  id: string;
  name: string;
  visibility: FileVisibility;
  versions?: FileVersionListItem[];
};

export default function FileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [file, setFile] = useState<RawFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    // The detail response embeds the newest versions; the dedicated versions
    // route is used when the full history is needed.
    setLoadError(null);
    return Promise.all([
      apiFetch<RawFile>(`/files/${id}`),
      // If the full history cannot be read, keep the newest versions the detail
      // response already carries instead of showing "no versions" (F04).
      apiFetch<FileVersionListItem[]>(`/files/${id}/versions`).catch(() => null),
    ])
      .then(([asset, versions]) => setFile({ ...asset, versions: versions ?? asset.versions ?? [] }))
      // Any failure used to read "not found"; now the reason is shown and the load can be repeated (F04).
      .catch((err) => { setFile(null); setLoadError(err instanceof Error ? err.message : 'File not found.'); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="p-6 text-sm text-slate-500">Loading…</p>;
  if (!file) return <div className="p-6"><ErrorState title="This file could not be opened" message={loadError ?? 'File not found.'} onRetry={() => { setLoading(true); void load(); }} /></div>;

  return (
    <FileDetail
      id={file.id}
      name={file.name}
      visibility={file.visibility}
      versions={file.versions ?? []}
      onChanged={() => void load()}
    />
  );
}
