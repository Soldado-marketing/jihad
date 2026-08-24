/**
 * Phase 2 — Minimal structured (JSON) logging, dependency-free.
 *
 * Emits one JSON object per line so logs are machine-readable in any host
 * platform. Secrets are never logged: callers pass explicit fields only, and
 * a small redaction pass strips well-known sensitive keys defensively.
 */

const SENSITIVE_KEY = /(password|secret|token|authorization|cookie|apikey|api_key|credential)/i;

export type LogLevel = 'info' | 'warn' | 'error';

/** Removes values for keys that look sensitive (defence in depth). */
export function redact(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : value;
  }
  return out;
}

/** Writes a single structured log line. */
export function logStructured(
  level: LogLevel,
  message: string,
  fields: Record<string, unknown> = {},
): void {
  const entry = {
    level,
    time: new Date().toISOString(),
    service: 'maos-api',
    message,
    ...redact(fields),
  };

  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}
