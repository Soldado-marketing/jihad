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
