'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { FileDetail } from '@/components/files/file-detail';
import { type FileVisibility } from '@/components/files/file-visibility-badge';
import { type FileVersionListItem } from '@/components/files/file-version-list';
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

  const load = useCallback(() => {
    // The detail response embeds the newest versions; the dedicated versions
    // route is used when the full history is needed.
    return Promise.all([
      apiFetch<RawFile>(`/files/${id}`),
      apiFetch<FileVersionListItem[]>(`/files/${id}/versions`).catch(() => []),
    ])
      .then(([asset, versions]) => setFile({ ...asset, versions }))
      .catch(() => setFile(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="p-6 text-sm text-slate-500">Loading…</p>;
  if (!file) return <p className="p-6 text-sm text-red-500">File not found.</p>;

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
