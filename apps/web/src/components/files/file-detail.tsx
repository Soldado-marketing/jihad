'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { FileUploader } from './file-uploader';
import { FileVersionList, type FileVersionListItem } from './file-version-list';
import { FileVisibilityBadge, type FileVisibility } from './file-visibility-badge';
import { SignedUrlNotice } from './signed-url-notice';

export function FileDetail({
  id,
  name,
  versions,
  visibility,
  onChanged,
}: {
  id: string;
  name: string;
  versions: FileVersionListItem[];
  visibility: FileVisibility;
  onChanged?: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeVersion = versions.find((v) => v.status === 'ACTIVE') ?? versions[0];

  async function setVisibility(next: FileVisibility) {
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/files/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility: next }),
      });
      setMessage(
        next === 'CLIENT_VISIBLE'
          ? 'File marked client-visible. It still needs an approval before a client can open it.'
          : 'File is now internal only.',
      );
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change visibility.');
    } finally {
      setWorking(false);
    }
  }

  async function requestApproval() {
    if (!activeVersion) return;
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/approvals', {
        method: 'POST',
        body: JSON.stringify({
          title: `Approval for ${name} (v${activeVersion.versionNumber})`,
          fileAssetId: id,
          fileVersionId: activeVersion.id,
        }),
      });
      setMessage('Approval requested. Decide on it from the Approvals page.');
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request approval.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="file-detail-title"
        className="rounded-2xl border border-line bg-white p-6 shadow-lift"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">File</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 id="file-detail-title" className="text-3xl font-semibold text-ink">
            {name}
          </h2>
          <FileVisibilityBadge visibility={visibility} />
        </div>
        <p className="mt-2 text-sm text-slate-600">Reference: {id}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={working}
            onClick={() =>
              setVisibility(visibility === 'CLIENT_VISIBLE' ? 'INTERNAL' : 'CLIENT_VISIBLE')
            }
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
          >
            {visibility === 'CLIENT_VISIBLE' ? 'Make internal' : 'Make client-visible'}
          </button>

          <button
            type="button"
            disabled={working || !activeVersion}
            onClick={requestApproval}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            title={activeVersion ? undefined : 'Upload a version first'}
          >
            Request approval
          </button>
        </div>

        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </section>

      <FileUploader fileAssetId={id} onUploaded={onChanged} />
      <SignedUrlNotice />
      <FileVersionList versions={versions} fileAssetId={id} />
    </div>
  );
}
