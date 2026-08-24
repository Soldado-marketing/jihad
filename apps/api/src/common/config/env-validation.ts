/**
 * Phase 2 — Startup environment validation (dependency-free).
 *
 * Fails fast when required configuration is missing or unusable so the API
 * never boots into a half-configured state. Values are NEVER printed; only
 * variable names appear in error messages.
 */

import { validateJwtSecret } from './jwt-secret';

export interface EnvValidationResult {
  checked: string[];
  warnings: string[];
}

/** Variables that must be present and non-empty for the API to run at all. */
const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'] as const;

/** Variables that are optional but produce a warning when absent. */
const RECOMMENDED_VARS = ['CORS_ORIGINS', 'WEB_URL', 'REDIS_URL'] as const;

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

/**
 * Validates process environment. Throws a safe Error (no values) on failure.
 * Returns the list of checked variables plus non-fatal warnings.
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const missing: string[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];

  for (const name of REQUIRED_VARS) {
    if (isBlank(env[name])) missing.push(name);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Set them before starting the API (see apps/api/.env.example).',
    );
  }

  // DATABASE_URL must be a postgres connection string (shape only — never logged).
  const dbUrl = (env.DATABASE_URL ?? '').trim();
  if (!/^postgres(ql)?:\/\//i.test(dbUrl)) {
    invalid.push('DATABASE_URL (expected a postgresql:// connection string)');
  }

  // JWT_SECRET strength is enforced by the shared validator (S-01).
  try {
    validateJwtSecret(env.JWT_SECRET);
  } catch (err) {
    invalid.push(`JWT_SECRET (${(err as Error).message})`);
  }

  // PORT, when provided, must be a valid TCP port.
  if (!isBlank(env.PORT)) {
    const port = Number(env.PORT);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      invalid.push('PORT (expected an integer between 1 and 65535)');
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Invalid environment configuration: ${invalid.join('; ')}.`);
  }

  for (const name of RECOMMENDED_VARS) {
    if (isBlank(env[name])) {
      warnings.push(`${name} is not set; a safe default will be used.`);
    }
  }

  return {
    checked: [...REQUIRED_VARS, ...RECOMMENDED_VARS],
    warnings,
  };
}
