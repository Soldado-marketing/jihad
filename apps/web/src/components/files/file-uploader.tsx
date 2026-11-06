'use client';

import { useEffect, useReducer, useRef } from 'react';
import { apiFetch, apiUpload } from '@/lib/fetch';
import {
  classifyUploadError,
  describeUpload,
  findArrivedVersion,
  formatFileSize,
  INITIAL_UPLOAD_STATE,
  isUploading,
  type KnownVersion,
  uploadReducer,
} from '@/lib/upload-state';

/**
 * Uploads a new version of a file asset (plan rows C02, C06).
 *
 * The bytes go to POST /api/files/:id/versions as multipart/form-data under the
 * field name "file" — the name the server's FileInterceptor expects. The server
 * decides the object key, validates the content signature and enforces the size
 * limit; nothing here is trusted, so this component only has to surface the
 * outcome: progress while the body is sent, a saving phase while the server
 * stores it, Cancel while it runs, and after a failure either "Try again" (lost
 * connection, busy server) or a sentence explaining why this file is refused.
 * Before a retry the version list is checked, so a response lost on the way
 * back never produces a duplicate version.
 */
export function FileUploader({
  fileAssetId,
  onUploaded,
}: {
  fileAssetId: string;
  onUploaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [state, dispatch] = useReducer(uploadReducer, INITIAL_UPLOAD_STATE);
  const [link, setLink] = useReducer((_: string, next: string) => next, '');

  const busy = isUploading(state);

  // Leaving the page aborts a running request; nothing is left dangling.
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function send(file: File) {
    const controller = new AbortController();
    controllerRef.current = controller;
    const body = new FormData();
    body.append('file', file);
    try {
      const version = await apiUpload<{ versionNumber: number }>(`/files/${fileAssetId}/versions`, body, {
        signal: controller.signal,
        onProgress: (percent) => dispatch({ type: 'progress', percent }),
        onSent: () => dispatch({ type: 'sent' }),
      });
      finish(version?.versionNumber ?? null);
    } catch (err) {
      const outcome = classifyUploadError(err);
      if (outcome.kind === 'cancelled') dispatch({ type: 'cancel' });
      else dispatch({ type: 'fail', failure: outcome.kind, message: outcome.message });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  function finish(versionNumber: number | null, message?: string) {
    dispatch({ type: 'succeed', versionNumber, message });
    fileRef.current = null;
    setLink('');
    if (inputRef.current) inputRef.current.value = '';
    onUploaded?.();
  }

  function start(file: File | null) {
    if (!file || busy) return;
    fileRef.current = file;
    dispatch({ type: 'choose', file: { name: file.name, size: file.size } });
    dispatch({ type: 'start', at: Date.now() });
    void send(file);
  }

  function cancel() {
    controllerRef.current?.abort();
  }

  /**
   * Try again after a lost connection: first look whether the file did arrive
   * (same name and size, created after the attempt began) and name that
   * version instead of sending the bytes a second time.
   */
  async function retry() {
    const file = fileRef.current;
    if (!file || busy || state.startedAt === null) return;
    const attemptStartedAt = state.startedAt;
    dispatch({ type: 'start', at: Date.now() });
    try {
      const versions = await apiFetch<KnownVersion[]>(`/files/${fileAssetId}/versions`);
      const arrived = findArrivedVersion(versions ?? [], { name: file.name, size: file.size }, attemptStartedAt);
      if (arrived) {
        finish(arrived.versionNumber, `Your file did arrive as version ${arrived.versionNumber}. Nothing was sent twice.`);
        return;
      }
    } catch {
      // The list could not be read; sending again is still the person's intent.
    }
    await send(file);
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

  const canRetry = state.phase === 'failed' && state.retryable && fileRef.current !== null;
  const chosen = state.file;

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
            const file = event.target.files?.[0] ?? null;
            fileRef.current = file;
            dispatch({ type: 'choose', file: file ? { name: file.name, size: file.size } : null });
          }}
          className="text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        {busy ? (
          <button
            type="button"
            onClick={cancel}
            className="min-h-11 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => start(fileRef.current)}
            disabled={!fileRef.current}
            className="min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Upload
          </button>
        )}
      </div>

      {chosen && !busy && state.phase !== 'done' && (
        <p className="mt-2 text-xs text-slate-500" data-testid="chosen-file">
          {chosen.name} · {formatFileSize(chosen.size)}
        </p>
      )}

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
          onClick={() => start(linkFile())}
          disabled={!linkFile() || busy}
          className="min-h-11 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          Add link
        </button>
      </div>

      {busy && (
        <div className="mt-4">
          <div
            role="progressbar"
            aria-valuenow={state.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload progress"
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-150"
              style={{ width: `${state.percent}%` }}
            />
          </div>
          <p role="status" className="mt-1 text-xs text-slate-500">{describeUpload(state)}</p>
        </div>
      )}

      {state.phase === 'failed' && state.message && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-red-600">
            {state.message}
            {!state.retryable && state.failure === 'rejected' ? ' Choose another file.' : ''}
          </p>
          {canRetry && (
            <button
              type="button"
              onClick={() => void retry()}
              className="min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
          )}
        </div>
      )}
      {state.phase === 'cancelled' && state.message && (
        <p role="status" className="mt-3 text-sm text-slate-700">{state.message}</p>
      )}
      {state.phase === 'done' && state.message && (
        <p role="status" className="mt-3 text-sm text-green-700">{state.message}</p>
      )}
    </section>
  );
}
