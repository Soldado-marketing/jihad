'use client';

import { use, useEffect, useState } from 'react';
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

  useEffect(() => {
    apiFetch<RawFile>(`/files/${id}`)
      .then(setFile)
      .catch(() => setFile(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!file) return <p className="text-sm text-red-500 p-6">File not found.</p>;

  return (
    <FileDetail
      id={file.id}
      name={file.name}
      visibility={file.visibility}
      versions={file.versions ?? []}
    />
  );
}
