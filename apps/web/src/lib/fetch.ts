/**
 * Authenticated API fetch helper.
 * Reads the JWT from localStorage and sends it as Bearer token.
 * Throws on non-2xx responses with the API error message.
 */
import { clearAuthSession, getAccessToken } from './auth';
import { apiBase } from './api';

export const SESSION_EXPIRED_MESSAGE = 'Session expired. Please sign in again.';
export const FORBIDDEN_MESSAGE = 'You do not have permission to view this page.';

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${apiBase()}${path}`, { ...options, headers });

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
