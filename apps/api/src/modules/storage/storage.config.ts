/**
 * Phase 3 — Object storage configuration.
 *
 * Values are resolved from the environment ONCE and never logged. Only
 * variable NAMES may appear in error messages (same contract as Phase 2's
 * env-validation).
 *
 * Storage is OPTIONAL at boot: the API starts without S3 so that developers
 * can run the rest of the stack. Upload/download routes fail closed with a
 * clear error when storage is not configured.
 */

/** Absolute ceiling for a single upload, regardless of configuration. */
export const MAX_UPLOAD_BYTES_HARD_LIMIT = 100 * 1024 * 1024; // 100 MiB

/** Default per-file upload ceiling when FILE_MAX_UPLOAD_BYTES is unset. */
export const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MiB

/** Variables that must all be present for object storage to be usable. */
export const STORAGE_REQUIRED_VARS = [
  'S3_BUCKET',
  'S3_REGION',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
] as const;

export interface StorageConfig {
  bucket: string;
  region: string;
  /** Custom endpoint for S3-compatible providers (MinIO, R2, Spaces). */
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Path-style addressing is required by most self-hosted S3 providers. */
  forcePathStyle: boolean;
  /** Optional namespace prefix inside the bucket. Normalised, never user-supplied. */
  keyPrefix: string;
  /** Per-file upload ceiling in bytes. */
  maxUploadBytes: number;
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

/** True when every required storage variable is present and non-empty. */
export function isStorageConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return STORAGE_REQUIRED_VARS.every((name) => !isBlank(env[name]));
}

/** Names of the storage variables that are missing (for safe error messages). */
export function missingStorageVars(env: NodeJS.ProcessEnv = process.env): string[] {
  return STORAGE_REQUIRED_VARS.filter((name) => isBlank(env[name]));
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (isBlank(value)) return fallback;
  return /^(1|true|yes|on)$/i.test((value as string).trim());
}

/**
 * Resolves the per-file upload ceiling.
 * Invalid or oversized values are rejected rather than silently clamped, so a
 * misconfiguration is visible at startup instead of at upload time.
 */
export function resolveMaxUploadBytes(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.FILE_MAX_UPLOAD_BYTES;
  if (isBlank(raw)) return DEFAULT_MAX_UPLOAD_BYTES;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('FILE_MAX_UPLOAD_BYTES (expected a positive integer number of bytes)');
  }
  if (parsed > MAX_UPLOAD_BYTES_HARD_LIMIT) {
    throw new Error(
      `FILE_MAX_UPLOAD_BYTES (exceeds the hard limit of ${MAX_UPLOAD_BYTES_HARD_LIMIT} bytes)`,
    );
  }
  return parsed;
}

/**
 * Normalises S3_KEY_PREFIX into either '' or 'segment/.../'.
 * Any traversal or absolute-path characters are stripped; the prefix is
 * operator-controlled, never request-controlled.
 */
export function resolveKeyPrefix(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.S3_KEY_PREFIX ?? '').trim();
  if (raw === '') return '';

  const cleaned = raw
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '' && segment !== '.' && segment !== '..')
    .map((segment) => segment.replace(/[^A-Za-z0-9._-]/g, ''))
    .filter((segment) => segment !== '')
    .join('/');

  return cleaned === '' ? '' : `${cleaned}/`;
}

/**
 * Builds the effective storage configuration.
 * Throws when storage is not configured — callers must check isStorageConfigured first.
 */
export function resolveStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const missing = missingStorageVars(env);
  if (missing.length > 0) {
    throw new Error(`Object storage is not configured. Missing: ${missing.join(', ')}.`);
  }

  const endpoint = (env.S3_ENDPOINT ?? '').trim();

  return {
    accessKeyId: (env.S3_ACCESS_KEY_ID as string).trim(),
    bucket: (env.S3_BUCKET as string).trim(),
    endpoint: endpoint === '' ? undefined : endpoint,
    // Custom endpoints (MinIO and friends) default to path-style addressing.
    forcePathStyle: parseBoolean(env.S3_FORCE_PATH_STYLE, endpoint !== ''),
    keyPrefix: resolveKeyPrefix(env),
    maxUploadBytes: resolveMaxUploadBytes(env),
    region: (env.S3_REGION as string).trim(),
    secretAccessKey: (env.S3_SECRET_ACCESS_KEY as string).trim(),
  };
}

export interface StorageEnvValidationResult {
  configured: boolean;
  warnings: string[];
}

/**
 * Startup validation for the storage configuration.
 *
 * Storage being absent is allowed (a warning). Storage being HALF configured is
 * not: that is a deployment mistake which would otherwise only surface on the
 * first upload attempt, so it fails fast instead.
 *
 * Only variable NAMES appear in messages - values are never echoed.
 */
export function validateStorageEnv(
  env: NodeJS.ProcessEnv = process.env,
): StorageEnvValidationResult {
  const missing = missingStorageVars(env);
  const warnings: string[] = [];

  // Checked first, and regardless of whether storage itself is configured: the
  // upload ceiling is used to reject oversized requests even when there is no
  // bucket to write them to.
  resolveMaxUploadBytes(env);

  if (missing.length === STORAGE_REQUIRED_VARS.length) {
    warnings.push(
      'Object storage is not configured; file upload and download routes will return 503.',
    );
    return { configured: false, warnings };
  }

  if (missing.length > 0) {
    throw new Error(
      `Incomplete object storage configuration. Missing: ${missing.join(', ')}.`,
    );
  }

  return { configured: true, warnings };
}
