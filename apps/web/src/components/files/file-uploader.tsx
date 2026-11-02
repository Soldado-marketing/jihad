'use client';

import { useRef, useState } from 'react';
import { apiUpload } from '@/lib/fetch';

/**
 * Uploads a new version of a file asset.
 *
 * The bytes go to POST /api/files/:id/versions as multipart/form-data under the
 * field name "file" — the name the server's FileInterceptor expects. The server
 * decides the object key, validates the content signature and enforces the size
 * limit; nothing here is trusted, so this component only has to surface the
 * outcome.
 */
export function FileUploader({
  fileAssetId,
  onUploaded,
}: {
  fileAssetId: string;
  onUploaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [link, setLink] = useState('');

  const busy = progress !== null;

  async function handleUpload(file: File | null = selected) {
    if (!file) return;
    setError(null);
    setDone(null);
    setProgress(0);

    const body = new FormData();
    body.append('file', file);

    try {
      const version = await apiUpload<{ versionNumber: number }>(
        `/files/${fileAssetId}/versions`,
        body,
        { onProgress: setProgress },
      );
      setDone(`Uploaded as version ${version?.versionNumber ?? '—'}.`);
      setSelected(null);
      setLink('');
      if (inputRef.current) inputRef.current.value = '';
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setProgress(null);
    }
  }

  // A link (Google Drive, Dropbox…) is stored as a small Internet-shortcut
  // file, so it is versioned, reviewed and checked like any other upload.
  function linkFile(): File | null {
    try {
      const url = new URL(link.trim());
      if (url.protocol !== 'https:') return null;
      return new File([`[InternetShortcut]\r\nURL=${url.href}\r\n`], 'link.url', { type: 'text/plain' });
    } catch {
      return null;
    }
  }

  return (
    <section
      aria-labelledby="file-upload-title"
      className="rounded-2xl border border-line bg-white p-6 shadow-lift"
    >
      <h3 id="file-upload-title" className="font-semibold text-ink">
        Upload a new version
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        The file is stored in object storage by the server. Allowed types are
        checked by content, not by file name.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          aria-label="Choose a file to upload"
          disabled={busy}
          onChange={(event) => {
            setSelected(event.target.files?.[0] ?? null);
            setError(null);
            setDone(null);
          }}
          className="text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={!selected || busy}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="url"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          disabled={busy}
          placeholder="Or paste a link (Google Drive, Dropbox…)"
          aria-label="Link to share instead of a file"
          className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
        <button
          type="button"
          onClick={() => void handleUpload(linkFile())}
          disabled={!linkFile() || busy}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          Add link
        </button>
      </div>

      {busy && (
        <div className="mt-4">
          <div
            role="progressbar"
            aria-valuenow={progress ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload progress"
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-150"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{progress ?? 0}%</p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {done && <p className="mt-3 text-sm text-green-700">{done}</p>}
    </section>
  );
}
