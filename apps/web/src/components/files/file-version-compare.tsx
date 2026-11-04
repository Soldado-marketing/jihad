'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiBlob } from '@/lib/fetch';
import {
  type CompareVersion,
  comparableVersions,
  defaultComparePair,
  formatBytes,
  formatSizeDelta,
  previewKind,
} from '@/lib/file-compare';

/**
 * Two versions of one file side by side (plan row D04): images and PDFs render
 * next to each other, every other type is compared by its details. The bytes
 * come through the same permission-checked content route as a preview, so no
 * storage key or pre-signed URL ever reaches the browser. Staff only: a client
 * opens a delivery, never the version history.
 */
export function FileVersionCompare({
  versions,
  fileAssetId,
}: {
  versions: CompareVersion[];
  fileAssetId: string;
}) {
  const options = useMemo(() => comparableVersions(versions), [versions]);
  const initial = useMemo(() => defaultComparePair(versions), [versions]);
  const [olderId, setOlderId] = useState<string | null>(initial?.olderId ?? null);
  const [newerId, setNewerId] = useState<string | null>(initial?.newerId ?? null);

  // A new upload arrives as new props: follow it unless the user already picked a pair.
  useEffect(() => {
    if (!initial) return;
    const known = new Set(options.map((v) => v.id));
    if (!olderId || !known.has(olderId)) setOlderId(initial.olderId);
    if (!newerId || !known.has(newerId)) setNewerId(initial.newerId);
  }, [initial, options, olderId, newerId]);

  if (options.length < 2) {
    return (
      <section aria-labelledby="compare-title" className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <h3 id="compare-title" className="text-lg font-semibold text-ink">Compare versions</h3>
        <p className="mt-2 text-sm text-slate-600">Upload a second version to see the two side by side.</p>
      </section>
    );
  }

  const older = options.find((v) => v.id === olderId) ?? null;
  const newer = options.find((v) => v.id === newerId) ?? null;
  const delta = older && newer ? formatSizeDelta(older.sizeBytes, newer.sizeBytes) : '';

  return (
    <section aria-labelledby="compare-title" className="rounded-2xl border border-line bg-white p-6 shadow-lift">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="compare-title" className="text-lg font-semibold text-ink">Compare versions</h3>
          <p className="mt-1 text-sm text-slate-600">
            Pick two versions. Images and PDFs show side by side; other files are compared by their details.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOlderId(newerId);
            setNewerId(olderId);
          }}
          className="min-h-11 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-slate-50"
        >
          Swap sides
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <VersionPane
          label="Left"
          fileAssetId={fileAssetId}
          options={options}
          selectedId={olderId}
          onSelect={setOlderId}
          version={older}
        />
        <VersionPane
          label="Right"
          fileAssetId={fileAssetId}
          options={options}
          selectedId={newerId}
          onSelect={setNewerId}
          version={newer}
        />
      </div>

      {delta && (
        <p className="mt-3 text-sm text-slate-600" aria-live="polite">
          Right is {delta.toLowerCase() === 'same size' ? 'the same size as' : `${delta} than`} left.
        </p>
      )}
    </section>
  );
}

function VersionPane({
  label,
  fileAssetId,
  options,
  selectedId,
  onSelect,
  version,
}: {
  label: string;
  fileAssetId: string;
  options: CompareVersion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  version: CompareVersion | null;
}) {
  const kind = previewKind(version?.originalName);
  const [preview, setPreview] = useState<{ url: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectId = `compare-${label.toLowerCase()}`;

  // Load the bytes for images and PDFs only; revoke the object URL when the
  // version changes or the pane goes away.
  useEffect(() => {
    setPreview(null);
    setError(null);
    if (!version || kind === 'metadata') return;
    let url: string | null = null;
    let cancelled = false;
    apiBlob(
      `/files/${fileAssetId}/versions/${version.id}/content?disposition=inline`,
      version.originalName ?? 'preview',
    )
      .then(({ blob }) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreview({ url, type: blob.type });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this version.');
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileAssetId, version?.id, version?.originalName, kind]);

  return (
    <article className="min-w-0 rounded-xl border border-line p-4" aria-label={`${label} version`}>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">{label}</span>
        <select
          id={selectId}
          value={selectedId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          {options.map((v) => (
            <option key={v.id} value={v.id}>
              Version {v.versionNumber}
              {v.originalName ? ` · ${v.originalName}` : ''}
            </option>
          ))}
        </select>
      </label>

      {version && (
        <>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-500">Name</dt>
            <dd className="min-w-0 break-words text-ink">{version.originalName ?? 'Metadata only'}</dd>
            <dt className="text-slate-500">Size</dt>
            <dd className="text-ink">{formatBytes(version.sizeBytes)}</dd>
            <dt className="text-slate-500">Uploaded</dt>
            <dd className="text-ink">{version.createdAt ? new Date(version.createdAt).toLocaleString() : '—'}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd className="text-ink">{version.status}</dd>
          </dl>

          <div className="mt-3">
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            {!error && kind === 'image' && (preview
              ? <img src={preview.url} alt={`Version ${version.versionNumber}`} className="max-h-[60vh] w-full rounded-lg border border-line bg-slate-50 object-contain" />
              : <p className="text-sm text-slate-500">Loading preview…</p>)}
            {!error && kind === 'pdf' && (preview
              ? <iframe src={preview.url} title={`Version ${version.versionNumber}`} className="h-[60vh] w-full rounded-lg border border-line" />
              : <p className="text-sm text-slate-500">Loading preview…</p>)}
            {kind === 'metadata' && (
              <p className="text-sm text-slate-600">This file type cannot be shown in the page, so its details are compared instead.</p>
            )}
          </div>
        </>
      )}
    </article>
  );
}
