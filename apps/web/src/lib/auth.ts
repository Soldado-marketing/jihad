/**
 * MAOS auth session helpers — browser-only (localStorage).
 * Import only from 'use client' components or client-side code paths.
 * Backend guards remain the source of truth for authorization.
 */

export interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export interface StoredTenant {
  id: string;
  name: string;
  slug: string;
}

const KEYS = {
  ACCESS_TOKEN: 'maos_access_token',
  REFRESH_TOKEN: 'maos_refresh_token',
  USER: 'maos_user',
  TENANT: 'maos_tenant',
} as const;

/** Persist a successful login response to localStorage. */
export function setAuthSession(params: {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
  tenant: StoredTenant;
}): void {
  localStorage.setItem(KEYS.ACCESS_TOKEN, params.accessToken);
  localStorage.setItem(KEYS.REFRESH_TOKEN, params.refreshToken);
  localStorage.setItem(KEYS.USER, JSON.stringify(params.user));
  localStorage.setItem(KEYS.TENANT, JSON.stringify(params.tenant));
}

/** Remove all auth data (logout). */
export function clearAuthSession(): void {
  (Object.values(KEYS) as string[]).forEach((key) => localStorage.removeItem(key));
}

/** Returns the stored access token or null. */
export function getAccessToken(): string | null {
  return localStorage.getItem(KEYS.ACCESS_TOKEN);
}

/** Returns the stored refresh token or null. */
export function getRefreshToken(): string | null {
  return localStorage.getItem(KEYS.REFRESH_TOKEN);
}

/** Returns the stored user object or null. */
export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(KEYS.USER);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

/** Returns the stored tenant object or null. */
export function getStoredTenant(): StoredTenant | null {
  try {
    const raw = localStorage.getItem(KEYS.TENANT);
    return raw ? (JSON.parse(raw) as StoredTenant) : null;
  } catch {
    return null;
  }
}

/** True if an access token is present in localStorage. */
export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
