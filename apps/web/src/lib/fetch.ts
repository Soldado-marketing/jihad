/**
 * Authenticated API fetch helper.
 * Reads the JWT from localStorage and sends it as a Bearer token.
 *
 * S-02 — Session renewal:
 * When an authenticated request returns 401, this helper attempts the backend
 * refresh endpoint once, updates the stored tokens on success, and retries the
 * original request once. Concurrent 401s share a single in-flight refresh so
 * only one rotation happens. Requests to auth endpoints never trigger refresh,
 * preventing recursion / infinite loops. If refresh fails, the session is
 * cleared and the user is redirected to login.
 */
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  updateAuthTokens,
} from './auth';
import { apiBase } from './api';

export const SESSION_EXPIRED_MESSAGE = 'Session expired. Please sign in again.';
export const FORBIDDEN_MESSAGE = 'You do not have permission to view this page.';

// Endpoints that must never trigger an automatic refresh (avoid recursion).
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/bootstrap'];

function isAuthPath(path: string): boolean {
  return AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}?`));
}

// Shared in-flight refresh promise — dedupes concurrent 401 handling.
let refreshInFlight: Promise<string | null> | null = null;

/** Perform a single token refresh. Returns the new access token or null. */
async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${apiBase()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken || !data.refreshToken) return null;
    updateAuthTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

/** Returns a shared refresh promise so concurrent callers trigger only one refresh. */
function refreshOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const runRequest = (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${apiBase()}${path}`, { ...options, headers });
  };

  let res = await runRequest(getAccessToken());

  // On 401 for a non-auth endpoint: try one refresh, then retry once.
  if (res.status === 401 && !isAuthPath(path) && typeof window !== 'undefined') {
    const newToken = await refreshOnce();
    if (newToken) {
      res = await runRequest(newToken);
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        clearAuthSession();
        if (window.location.pathname !== '/auth/login') {
          window.location.assign('/auth/login');
        }
      }
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }

    if (res.status === 403) {
      throw new Error(FORBIDDEN_MESSAGE);
    }

    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Binary transfers ─────────────────────────────────────────────────────────
// apiFetch always sends JSON and parses JSON. Uploads and downloads cannot use
// it: a multipart body must NOT carry a hand-written Content-Type (the browser
// has to add the boundary), and a PDF or an image must not be run through
// res.json(). These two helpers reuse the same single-flight refresh so a
// stale token behaves identically on every transport.

export interface UploadOptions {
  /** 0-100, fired as the request body is written. */
  onProgress?: (percent: number) => void;
  method?: 'POST' | 'PATCH' | 'PUT';
}

/**
 * Multipart upload with progress.
 *
 * XMLHttpRequest rather than fetch: fetch still has no upload progress event,
 * and an upload with no feedback is the thing users report as "it froze".
 */
export function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  options: UploadOptions = {},
): Promise<T> {
  const send = (token: string | null): Promise<{ status: number; body: string }> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options.method ?? 'POST', `${apiBase()}${path}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      // Content-Type is deliberately NOT set: the browser must supply the
      // multipart boundary itself.

      if (options.onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            options.onProgress?.(Math.round((event.loaded / event.total) * 100));
          }
        };
      }

      xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
      xhr.onerror = () => reject(new Error('Network error during upload.'));
      xhr.onabort = () => reject(new Error('Upload cancelled.'));
      xhr.send(formData);
    });

  const parse = (body: string): T => {
    if (!body) return undefined as T;
    try {
      return JSON.parse(body) as T;
    } catch {
      return undefined as T;
    }
  };

  const failure = (status: number, body: string): Error => {
    if (status === 403) return new Error(FORBIDDEN_MESSAGE);
    try {
      const parsed = JSON.parse(body) as { reason?: string; message?: string | string[] };
      const message = parsed.reason ?? parsed.message;
      if (Array.isArray(message)) return new Error(message.join(', '));
      if (message) return new Error(message);
    } catch {
      // fall through to the status-only message
    }
    return new Error(`Upload failed (HTTP ${status}).`);
  };

  return (async () => {
    let res = await send(getAccessToken());

    if (res.status === 401 && typeof window !== 'undefined') {
      const newToken = await refreshOnce();
      if (newToken) res = await send(newToken);
    }

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        clearAuthSession();
        if (window.location.pathname !== '/auth/login') {
          window.location.assign('/auth/login');
        }
      }
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }

    if (res.status < 200 || res.status >= 300) throw failure(res.status, res.body);
    return parse(res.body);
  })();
}

export interface BinaryResponse {
  blob: Blob;
  filename: string;
  contentType: string;
}

/**
 * Authorised binary download (file version content, invoice PDF).
 *
 * The bytes are streamed through the API, so the browser never sees a storage
 * key or a bucket URL. The filename comes from Content-Disposition when the
 * server sends one.
 */
export async function apiBlob(path: string, fallbackName = 'download'): Promise<BinaryResponse> {
  const run = (token: string | null): Promise<Response> =>
    fetch(`${apiBase()}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  let res = await run(getAccessToken());

  if (res.status === 401 && typeof window !== 'undefined') {
    const newToken = await refreshOnce();
    if (newToken) res = await run(newToken);
  }

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        clearAuthSession();
        if (window.location.pathname !== '/auth/login') {
          window.location.assign('/auth/login');
        }
      }
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
    if (res.status === 403) throw new Error(FORBIDDEN_MESSAGE);

    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { reason?: string; message?: string };
      message = body.reason ?? body.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const disposition = res.headers.get('content-disposition') ?? '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);

  return {
    blob: await res.blob(),
    contentType: res.headers.get('content-type') ?? 'application/octet-stream',
    filename: match?.[1] ?? fallbackName,
  };
}

/** Saves a blob to the user's machine under the given name. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick so the click has already been dispatched.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
