/**
 * Returns the normalised API base URL including the /api prefix.
 *
 * NEXT_PUBLIC_API_URL may be set to:
 *   - "http://localhost:3001"        → "http://localhost:3001/api"
 *   - "http://localhost:3001/api"    → "http://localhost:3001/api"  (idempotent)
 *   - unset                          → "http://localhost:3001/api"  (default)
 *
 * Always use this helper in browser fetch calls.
 * Never build fetch URLs from NEXT_PUBLIC_API_URL directly.
 */
export function apiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}
