/**
 * Arithmetic of the load assessment (MAOS A07). Kept apart from the runner so
 * it is tested without a server (scripts/test/perf-tools.test.mjs).
 */

/** Nearest-rank percentile of latencies in milliseconds; `p` in (0, 100]. Empty input has no percentile. */
export function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (!(p > 0 && p <= 100)) throw new RangeError('percentile must be within (0, 100]');
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

const round = (n) => (n === null ? null : Math.round(n * 10) / 10);

/**
 * One endpoint's result. Only answers with the expected status count as
 * measured requests: a refusal or a throttled request is fast and would
 * flatter the percentiles, so it is counted as an error and left out of them.
 */
export function summarise(samples, { expectStatus = 200, seconds }) {
  const ok = samples.filter((s) => s.status === expectStatus);
  const latencies = ok.map((s) => s.ms);
  const statuses = {};
  for (const s of samples) statuses[s.status] = (statuses[s.status] ?? 0) + 1;
  return {
    requests: samples.length,
    ok: ok.length,
    errors: samples.length - ok.length,
    statuses,
    perSecond: seconds > 0 ? round(ok.length / seconds) : null,
    p50: round(percentile(latencies, 50)),
    p95: round(percentile(latencies, 95)),
    p99: round(percentile(latencies, 99)),
    max: round(latencies.length ? Math.max(...latencies) : null),
    bytes: ok.length ? Math.round(ok.reduce((sum, s) => sum + (s.bytes ?? 0), 0) / ok.length) : null,
  };
}

/** The bound of the task: p95 under `limitMs`, with no failed request and at least one measured. */
export function verdict(summary, limitMs = 500) {
  if (summary.ok === 0) return 'NO DATA';
  if (summary.errors > 0) return 'ERRORS';
  return summary.p95 < limitMs ? 'PASS' : 'FAIL';
}

/** `--key value` and `--flag` pairs of a command line. */
export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[arg.slice(2)] = true;
    else { out[arg.slice(2)] = next; i++; }
  }
  return out;
}

/**
 * The run may only ever talk to this machine. A load run or a seed pointed at
 * anything else is refused before the first request.
 */
export function assertLocal(url, what) {
  let host;
  try { host = new URL(url).hostname; } catch { throw new Error(`${what}: not a URL`); }
  if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host)) {
    throw new Error(`${what} must be on this machine (127.0.0.1); refusing "${host}"`);
  }
}

/** A markdown table row per endpoint, in the order measured. */
export function markdownTable(rows, limitMs = 500) {
  const head = '| Endpoint | As | Rows | Size | Requests | Errors | p50 ms | p95 ms | p99 ms | max ms | req/s | p95 < ' + limitMs + ' ms |\n|---|---|---|---|---|---|---|---|---|---|---|---|';
  const kb = (b) => (b === null ? '—' : b >= 1024 * 1024 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`);
  const body = rows.map((r) => `| \`${r.label}\` | ${r.as} | ${r.rows ?? '—'} | ${kb(r.bytes)} | ${r.requests} | ${r.errors} | ${r.p50 ?? '—'} | ${r.p95 ?? '—'} | ${r.p99 ?? '—'} | ${r.max ?? '—'} | ${r.perSecond ?? '—'} | ${verdict(r, limitMs)} |`);
  return [head, ...body].join('\n');
}
