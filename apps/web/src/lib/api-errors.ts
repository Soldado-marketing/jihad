/**
 * Plain-language API errors (MAOS F02).
 *
 * Everything a page shows after a failed request goes through
 * `apiErrorMessage`. A sentence the API wrote for people ("Invoice not found",
 * "Only the owner can set a project budget.", validation messages) passes
 * through. Machine codes (`own_entries_only`, `INVALID_STATUS`), framework
 * defaults ("Not Found", "Cannot GET /x"), internal names and anything that
 * looks like a stack or a database error are replaced by a short sentence for
 * the status code. Clients and staff get the same wording; nothing here names a
 * table, a module or a role.
 */

export const SESSION_EXPIRED_MESSAGE = 'Session expired. Please sign in again.';
export const FORBIDDEN_MESSAGE = 'You do not have permission to view this page.';
export const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.';
export const SERVER_MESSAGE = 'Something went wrong on our side. Please try again in a moment.';
export const GENERIC_MESSAGE = 'This could not be completed. Please try again.';

/** One sentence per status code the API uses, for when its body has nothing fit to show. */
export const PLAIN_MESSAGES: Readonly<Record<number, string>> = {
  400: 'Please check what you entered and try again.',
  401: SESSION_EXPIRED_MESSAGE,
  403: FORBIDDEN_MESSAGE,
  404: 'This could not be found. It may have been removed, or it may not be available to you.',
  409: 'This clashes with something that already exists or was changed in the meantime. Reload and try again.',
  410: 'This is no longer available.',
  413: 'That file is too large.',
  415: 'That file type is not supported.',
  422: 'This cannot be done in its current state.',
  429: 'Too many attempts. Please wait a moment and try again.',
};

// Framework defaults that only repeat the status code.
const FRAMEWORK_DEFAULTS = new Set(
  [
    'bad request', 'unauthorized', 'forbidden', 'not found', 'conflict', 'gone', 'payload too large',
    'unsupported media type', 'unprocessable entity', 'too many requests', 'internal server error',
    'service unavailable', 'bad gateway', 'gateway timeout',
  ],
);

// Codes and internals that must never reach a person.
const CODE_SHAPE = /^[A-Z0-9_]+$|^[a-z0-9]+(?:_[a-z0-9]+)+$/;
const INTERNAL = /prisma|\bP\d{4}\b|TypeError|ReferenceError|SyntaxError|\bundefined\b|\[object |\bnull\b|\bat \S.*:\d+|^Cannot (?:GET|POST|PUT|PATCH|DELETE) |\btenant\b|\bjwt\b|\bsql\b|\bconstraint\b|\bECONN|\bENOTFOUND\b|\bstack\b|\bHTTP \d{3}\b/i;

/** True when `text` reads as a sentence written for the person using the app. */
export function isPlainMessage(text: unknown): text is string {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 3 || t.length > 240 || t.includes('\n')) return false;
  if (FRAMEWORK_DEFAULTS.has(t.toLowerCase())) return false;
  if (CODE_SHAPE.test(t)) return false;
  return !INTERNAL.test(t);
}

type ErrorBody = { reason?: unknown; message?: unknown } | null | undefined;

/** The sentence to show for a failed request: the API's own when it is fit for people, else a plain one for the status. */
export function apiErrorMessage(status: number, body?: unknown): string {
  if (status === 401) return SESSION_EXPIRED_MESSAGE;
  // Refusals keep one wording; the API's reason codes stay in the log, not on screen.
  if (status === 403) return FORBIDDEN_MESSAGE;

  const b = (body && typeof body === 'object' ? body : undefined) as ErrorBody;
  for (const candidate of [b?.reason, b?.message]) {
    if (Array.isArray(candidate)) {
      // class-validator: one sentence per field, all of them meant for the form.
      if (candidate.length > 0 && candidate.every(isPlainMessage)) return candidate.map((c) => c.trim()).join('. ');
      continue;
    }
    if (isPlainMessage(candidate)) return candidate.trim();
  }

  if (status >= 500) return SERVER_MESSAGE;
  return PLAIN_MESSAGES[status] ?? GENERIC_MESSAGE;
}
