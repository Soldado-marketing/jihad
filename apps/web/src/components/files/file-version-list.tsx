'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/states/empty-state';
import { apiBlob, saveBlob } from '@/lib/fetch';

export type FileVersionListItem = {
  id: string;
  versionNumber: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'QUARANTINED' | 'BLOCKED';
  originalName?: string | null;
  sizeBytes?: number | null;
  createdAt?: string;
};

/** Only these come back from the server as inline-safe, so only these preview. */
const PREVIEWABLE = /\.(png|jpe?g|gif|webp|pdf)$/i;

function formatSize(bytes?: number | null): string {
  if (typeof bytes !== 'number') return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileVersionList({
  versions,
  fileAssetId,
}: {
  versions: FileVersionListItem[];
  /** Omit to render read-only (no download actions). */
  fileAssetId?: string;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (versions.length === 0) {
    return (
      <EmptyState
        title="No versions yet"
        description="Upload a file above to create the first version."
      />
    );
  }

  async function transfer(versionId: string, mode: 'inline' | 'attachment', name?: string | null) {
    if (!fileAssetId) return;
    setBusyId(versionId);
    setError(null);
    try {
      // The bytes are streamed through the API after authorisation. No storage
      // key, bucket name or pre-signed URL is ever handled by the browser.
      const result = await apiBlob(
        `/files/${fileAssetId}/versions/${versionId}/content?disposition=${mode}`,
        name ?? 'download',
      );

      if (mode === 'inline') {
        const url = URL.createObjectURL(result.blob);
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          // Pop-up blocked — fall back to saving rather than losing the click.
          saveBlob(result.blob, result.filename);
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }

      saveBlob(result.blob, result.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <ul
        className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift"
        aria-label="File version list"
      >
        {versions.map((version) => {
          const downloadable = version.status === 'ACTIVE' || version.status === 'SUPERSEDED';
          const previewable = downloadable && PREVIEWABLE.test(version.originalName ?? '');
          const busy = busyId === version.id;

          return (
            <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <span className="font-semibold text-ink">Version {version.versionNumber}</span>
                <p className="mt-0.5 truncate text-sm text-slate-600">
                  {version.originalName ?? 'Metadata only'}
                  {version.sizeBytes ? ` · ${formatSize(version.sizeBytes)}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">{version.status}</span>

                {fileAssetId && previewable && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => transfer(version.id, 'inline', version.originalName)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
                  >
                    Preview
                  </button>
                )}

                {fileAssetId && downloadable && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => transfer(version.id, 'attachment', version.originalName)}
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {busy ? 'Working…' : 'Download'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
