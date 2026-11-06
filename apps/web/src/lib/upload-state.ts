/**
 * Upload state machine for the file uploader (plan row C06).
 *
 * Pure: no DOM, no fetch. The component dispatches events from the transport
 * (`apiUpload`) and from the person (choose, start, cancel, try again); this
 * module decides what the page shows and whether a retry can help. Tested in
 * test/upload-state.test.mjs.
 *
 * Phases:
 *   idle       nothing chosen or the last attempt finished
 *   sending    the body is being written; `percent` rises 0 → 100
 *   saving     the body is sent; the server validates and stores the file
 *   done       the server answered with the new version
 *   cancelled  the person aborted the request before the server answered
 *   failed     the request failed; `retryable` says whether trying again can help
 */
// No imports: node --test loads this file directly (see test/upload-state.test.mjs),
// so the transport passes the plain sentences in (api-errors.ts, MAOS F02).

export const CANCELLED_MESSAGE = 'Upload cancelled. Nothing was saved.';

/** The person aborted the request before the server answered. */
export class UploadCancelledError extends Error {
  readonly name = 'UploadCancelledError';
  constructor() {
    super(CANCELLED_MESSAGE);
  }
}

/** The request never completed: connection lost, server unreachable. */
export class UploadNetworkError extends Error {
  readonly name = 'UploadNetworkError';
  constructor(message: string) {
    super(message);
  }
}

/** The server answered with a failure status; `message` is already plain. */
export class UploadFailedError extends Error {
  readonly name = 'UploadFailedError';
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type UploadPhase = 'idle' | 'sending' | 'saving' | 'done' | 'cancelled' | 'failed';

/** Why an attempt failed, as the page needs it. */
export type FailureKind =
  | 'network' // the request never completed: connection lost, server unreachable
  | 'server' // the server failed or was busy (5xx, 429, 408): the same file may go through later
  | 'rejected' // the server refused this file; sending it again gives the same answer
  | 'session'; // the session expired; the page is already heading to sign-in

export interface ChosenFile {
  name: string;
  size: number;
}

export interface UploadState {
  phase: UploadPhase;
  file: ChosenFile | null;
  /** 0–100 while sending; 100 while saving. */
  percent: number;
  /** When the current or last attempt began (ms since epoch); duplicate detection needs it. */
  startedAt: number | null;
  /** The sentence shown under the controls (success, cancel or failure). */
  message: string | null;
  failure: FailureKind | null;
  /** True when "Try again" makes sense for the last failure. */
  retryable: boolean;
  versionNumber: number | null;
}

export type UploadEvent =
  | { type: 'choose'; file: ChosenFile | null }
  | { type: 'start'; at: number }
  | { type: 'progress'; percent: number }
  | { type: 'sent' }
  | { type: 'succeed'; versionNumber: number | null; message?: string }
  | { type: 'cancel' }
  | { type: 'fail'; failure: FailureKind; message: string };

export const INITIAL_UPLOAD_STATE: UploadState = {
  phase: 'idle',
  file: null,
  percent: 0,
  startedAt: null,
  message: null,
  failure: null,
  retryable: false,
  versionNumber: null,
};

const clampPercent = (value: number) => (Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0);

/** True while a request is in flight: the controls must be locked and Cancel offered. */
export const isUploading = (state: UploadState) => state.phase === 'sending' || state.phase === 'saving';

export function uploadReducer(state: UploadState, event: UploadEvent): UploadState {
  switch (event.type) {
    case 'choose':
      // A new choice clears the previous outcome; choosing is impossible mid-flight (the input is disabled).
      if (isUploading(state)) return state;
      return { ...INITIAL_UPLOAD_STATE, file: event.file };
    case 'start':
      if (!state.file || isUploading(state)) return state;
      return { ...state, phase: 'sending', percent: 0, startedAt: event.at, message: null, failure: null, retryable: false, versionNumber: null };
    case 'progress':
      if (state.phase !== 'sending') return state;
      return { ...state, percent: clampPercent(event.percent) };
    case 'sent':
      if (state.phase !== 'sending') return state;
      return { ...state, phase: 'saving', percent: 100 };
    case 'succeed':
      if (!isUploading(state)) return state;
      return {
        ...state,
        phase: 'done',
        percent: 100,
        file: null,
        versionNumber: event.versionNumber,
        message: event.message ?? `Uploaded as version ${event.versionNumber ?? '—'}.`,
        failure: null,
        retryable: false,
      };
    case 'cancel':
      if (!isUploading(state)) return state;
      // The file stays chosen so one tap on Upload sends it again.
      return { ...state, phase: 'cancelled', percent: 0, message: CANCELLED_MESSAGE, failure: null, retryable: false };
    case 'fail':
      if (!isUploading(state)) return state;
      return {
        ...state,
        phase: 'failed',
        percent: 0,
        message: event.message,
        failure: event.failure,
        retryable: event.failure === 'network' || event.failure === 'server',
      };
    default:
      return state;
  }
}

/** The short status line next to the progress bar. */
export function describeUpload(state: UploadState): string {
  switch (state.phase) {
    case 'sending':
      return `Sending… ${state.percent}%`;
    case 'saving':
      return 'Sent. Saving on the server…';
    default:
      return '';
  }
}

/** Sorts a transport error into a failure the page can explain; `cancelled` is returned separately. */
export function classifyUploadError(error: unknown): { kind: FailureKind | 'cancelled'; message: string } {
  if (error instanceof UploadCancelledError) return { kind: 'cancelled', message: error.message };
  if (error instanceof UploadNetworkError) return { kind: 'network', message: error.message };
  if (error instanceof UploadFailedError) {
    if (error.status === 401) return { kind: 'session', message: error.message };
    if (error.status >= 500 || error.status === 429 || error.status === 408) return { kind: 'server', message: error.message };
    return { kind: 'rejected', message: error.message };
  }
  const message = error instanceof Error && error.message ? error.message : 'Upload failed.';
  // An unknown error with no status: treat it like a refusal (no retry) so a retry loop cannot start by accident.
  return { kind: 'rejected', message };
}

export interface KnownVersion {
  versionNumber: number;
  originalName?: string | null;
  sizeBytes?: number | null;
  createdAt?: string;
}

/**
 * The version that most likely IS the file of a failed attempt: same name,
 * same size, created after the attempt began. Used before a retry so a lost
 * response does not turn into a duplicate version.
 */
export function findArrivedVersion(versions: readonly KnownVersion[], file: ChosenFile, startedAt: number): KnownVersion | null {
  const since = startedAt - 5_000; // clocks of browser and server may differ by a little
  const matches = versions
    .filter((v) => v.originalName === file.name && v.sizeBytes === file.size && !!v.createdAt && Date.parse(v.createdAt) >= since)
    .sort((a, b) => b.versionNumber - a.versionNumber);
  return matches[0] ?? null;
}

/** Human size for the chosen-file line: "18.4 MB", "212.0 KB", "512 B". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
