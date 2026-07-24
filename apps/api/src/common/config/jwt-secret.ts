/**
 * Centralized validation for the JWT signing secret (Security MVP — S-01).
 *
 * Startup fails safely when JWT_SECRET is missing, empty, too short, or a known
 * unsafe placeholder. The secret value itself is NEVER included in any thrown
 * error message or log output.
 */

export const MIN_JWT_SECRET_LENGTH = 32;

// Substrings that indicate a placeholder / non-production secret.
const UNSAFE_SUBSTRINGS = [
  'changeme',
  'change-me',
  'change_me',
  'changethis',
  'placeholder',
  'your-secret',
  'yoursecret',
  'secret-here',
  'example-secret',
];

// Exact (lowercased) values that are never acceptable secrets.
const UNSAFE_EXACT = new Set(['secret', 'password', 'jwt', 'jwtsecret', 'jwt-secret']);

/**
 * Returns the validated JWT secret, or throws a safe error (without the value).
 * Use the returned value directly for JwtModule and JwtStrategy so both share
 * one validated source of truth.
 */
export function validateJwtSecret(secret: string | undefined | null): string {
  if (secret === undefined || secret === null || secret.trim() === '') {
    throw new Error(
      'JWT_SECRET is not set. Define a strong JWT_SECRET (at least ' +
        `${MIN_JWT_SECRET_LENGTH} characters) in the environment before starting the API.`,
    );
  }

  const value = secret.trim();

  if (value.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET is too short. It must be at least ${MIN_JWT_SECRET_LENGTH} characters. ` +
        'Update the environment with a strong, unique secret.',
    );
  }

  const lowered = value.toLowerCase();
  if (UNSAFE_EXACT.has(lowered) || UNSAFE_SUBSTRINGS.some((s) => lowered.includes(s))) {
    throw new Error(
      'JWT_SECRET is set to an unsafe placeholder value. ' +
        'Replace it with a strong, unique secret before starting the API.',
    );
  }

  return value;
}
