/**
 * J07 — No caching of API responses by default (pure helper, no Nest imports
 * so tests can load it directly).
 *
 * Every response from this service is either authenticated, tenant-scoped or
 * an operational endpoint; none of it belongs in a browser or proxy cache. A
 * company switch (MAOS-J02) rotates the session, and a cached list from the
 * previous company must never be shown again. Browsers do not heuristically
 * cache JSON without validators, but a default is not a guarantee: this makes
 * `Cache-Control: no-store` the explicit rule.
 *
 * It is a DEFAULT, applied before any handler runs: a handler that needs a
 * different policy (file streams, invoice PDFs and CSV exports already send
 * `private, no-store`) sets its own `Cache-Control`, which replaces this one.
 */

export const CACHE_CONTROL_HEADER = 'Cache-Control';
export const NO_STORE = 'no-store';

/** Minimal response surface so the helper can be unit-tested without Express. */
export interface HeaderSink {
  hasHeader(name: string): boolean;
  setHeader(name: string, value: string): unknown;
}

/**
 * Sets `Cache-Control: no-store` unless a Cache-Control header is already
 * present. Returns true when it set the header.
 */
export function applyNoStoreDefault(res: HeaderSink): boolean {
  if (res.hasHeader(CACHE_CONTROL_HEADER)) return false;
  res.setHeader(CACHE_CONTROL_HEADER, NO_STORE);
  return true;
}
