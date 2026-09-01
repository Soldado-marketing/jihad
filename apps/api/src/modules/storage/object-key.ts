/**
 * Phase 3 - Server-side object key generation and path-traversal defence.
 *
 * Contract:
 *  - Object keys are ALWAYS generated on the server. A client never supplies,
 *    influences, or sees a storage key.
 *  - Every key is namespaced by tenantId, which makes a cross-tenant read
 *    detectable (and rejectable) before any call reaches the bucket.
 *  - The original filename is metadata only. It is sanitised and stored in the
 *    database; it never becomes part of the object key.
 *
 * These are pure functions with no I/O so they can be unit-tested directly.
 */

import { randomUUID } from 'node:crypto';

/** Characters permitted in a generated object key (positive allow-list). */
const SAFE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

/** Characters permitted in a stored display filename (positive allow-list). */
const UNSAFE_NAME_CHARS = /[^A-Za-z0-9._ -]/g;

/** Maximum length of a stored original filename. */
export const MAX_ORIGINAL_NAME_LENGTH = 180;

export class UnsafeObjectKeyError extends Error {
  constructor(reason: string) {
    super(`Unsafe object key: ${reason}`);
    this.name = 'UnsafeObjectKeyError';
  }
}

/**
 * True when the value contains an ASCII control character.
 * Written as a code-point scan rather than a regex so the source stays free of
 * literal control characters.
 */
export function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Reduces a client-supplied filename to a safe, storable display name.
 *
 * Removes directory components (both POSIX and Windows separators), control
 * characters, and leading dots, then constrains the result to a conservative
 * charset. Returns 'file' when nothing usable remains, so the caller always
 * gets a non-empty name.
 */
export function sanitizeOriginalName(rawName: string | undefined | null): string {
  if (typeof rawName !== 'string') return 'file';

  // Strip any directory component; keep the last path segment only.
  const lastSegment = rawName.split(/[\\/]/).pop() ?? '';

  const cleaned = lastSegment
    .split('')
    .filter((char) => !hasControlCharacters(char))
    .join('')
    .replace(UNSAFE_NAME_CHARS, '_')
    .replace(/_{2,}/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .trim();

  if (cleaned === '' || cleaned === '.' || cleaned === '..') return 'file';

  return cleaned.slice(0, MAX_ORIGINAL_NAME_LENGTH);
}

/**
 * Extracts a normalised, lowercase extension (including the dot) from a name.
 * Returns '' when there is no usable extension.
 */
export function extensionOf(name: string): string {
  const sanitized = sanitizeOriginalName(name);
  const dotIndex = sanitized.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === sanitized.length - 1) return '';

  const ext = sanitized.slice(dotIndex + 1).toLowerCase();
  if (!/^[a-z0-9]{1,12}$/.test(ext)) return '';

  return `.${ext}`;
}

/**
 * Rejects any key that could escape its namespace or confuse a storage backend.
 * Called on every generated key AND on every key read back from the database,
 * so a tampered or legacy row cannot be used to reach an arbitrary object.
 */
export function assertSafeObjectKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0) {
    throw new UnsafeObjectKeyError('key is empty');
  }
  if (key.length > 1024) {
    throw new UnsafeObjectKeyError('key exceeds 1024 characters');
  }
  if (key.startsWith('/')) {
    throw new UnsafeObjectKeyError('key is absolute');
  }
  if (key.includes('\\')) {
    throw new UnsafeObjectKeyError('key contains a backslash');
  }
  if (hasControlCharacters(key)) {
    throw new UnsafeObjectKeyError('key contains control characters');
  }
  if (key.includes('//')) {
    throw new UnsafeObjectKeyError('key contains an empty segment');
  }

  const segments = key.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new UnsafeObjectKeyError('key contains a traversal segment');
  }
  if (!SAFE_KEY_PATTERN.test(key)) {
    throw new UnsafeObjectKeyError('key contains disallowed characters');
  }
}

/**
 * Returns the namespace every object of a tenant must live under.
 * Used both when writing (to build the key) and when reading (to verify it).
 */
export function tenantNamespace(keyPrefix: string, tenantId: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(tenantId)) {
    throw new UnsafeObjectKeyError('tenant id has an unexpected shape');
  }
  return `${keyPrefix}tenants/${tenantId}/`;
}

export interface BuildObjectKeyInput {
  keyPrefix: string;
  tenantId: string;
  fileAssetId: string;
  versionNumber: number;
  originalName?: string | null;
}

/**
 * Builds the canonical object key for a file version.
 *
 * Shape: <prefix>tenants/<tenantId>/files/<fileAssetId>/v<n>/<uuid><ext>
 *
 * The random UUID makes the key unguessable, and the extension is derived from
 * a sanitised filename (never used verbatim), so a client cannot steer the key
 * toward another tenant's namespace.
 */
export function buildObjectKey(input: BuildObjectKeyInput): string {
  const { keyPrefix, tenantId, fileAssetId, versionNumber, originalName } = input;

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(fileAssetId)) {
    throw new UnsafeObjectKeyError('file asset id has an unexpected shape');
  }
  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    throw new UnsafeObjectKeyError('version number must be a positive integer');
  }

  const namespace = tenantNamespace(keyPrefix, tenantId);
  const extension = extensionOf(originalName ?? '');
  const key = `${namespace}files/${fileAssetId}/v${versionNumber}/${randomUUID()}${extension}`;

  assertSafeObjectKey(key);
  return key;
}

/**
 * Tenant isolation on the read path (defence in depth).
 *
 * Even when a database row has already been filtered by tenantId, the key
 * itself is re-checked before it is handed to the storage backend. A row whose
 * key points outside the tenant namespace is treated as tampered.
 */
export function assertKeyBelongsToTenant(
  key: string,
  keyPrefix: string,
  tenantId: string,
): void {
  assertSafeObjectKey(key);

  const namespace = tenantNamespace(keyPrefix, tenantId);
  if (!key.startsWith(namespace)) {
    throw new UnsafeObjectKeyError('key is outside the tenant namespace');
  }
}
