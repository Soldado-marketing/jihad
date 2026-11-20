/**
 * Load runner of the assessment (MAOS A07). Plain Node, no dependency.
 *
 * For each endpoint: `--users` people (default 20) each keep one request in
 * flight for `--seconds` (default 20); every answer's time is taken from the
 * moment the request is sent until its whole body has arrived. Only this
 * machine is ever addressed (lib.assertLocal).
 *
 * The API keeps its rate limit on (600 requests a minute per client address,
 * as in production). The limit is not what is measured, so the requests are
 * spread over simulated client addresses, the way separate people arrive
 * behind the proxy; a throttled answer would show up as an error, never as a
 * fast request.
 *
 * Usage: node scripts/perf/load.mjs --api http://127.0.0.1:3911/api --seed <seed.json> --out <results.json> [--users 20] [--seconds 20]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { assertLocal, markdownTable, parseArgs, summarise } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const API = String(args.api ?? '').replace(/\/$/, '');
const USERS = Number(args.users ?? 20);
const SECONDS = Number(args.seconds ?? 20);
if (!API || !args.seed || !args.out) { console.error('usage: load.mjs --api <url> --seed <seed.json> --out <results.json> [--users 20] [--seconds 20]'); process.exit(2); }
assertLocal(API, 'the API');
const seed = JSON.parse(readFileSync(args.seed, 'utf8'));
const s = seed.sample;

// 2,000 simulated addresses, used in turn: enough that none of them comes near
// the limit at the highest rate seen (about 3,000 answers a second is 90 a
// minute per address).
const ADDRESSES = 2000;
let address = 0;
const nextAddress = () => { address = (address + 1) % ADDRESSES; return `10.200.${Math.floor(address / 250)}.${(address % 250) + 1}`; };

async function login(role) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': nextAddress() },
    body: JSON.stringify({ email: seed.people[role], passwordOrMagicCode: seed.password, tenantSlug: seed.tenantSlug }),
  });
  if (res.status !== 200) throw new Error(`sign-in as ${role}: ${res.status}`);
  return (await res.json()).tokens.accessToken;
}

async function once(path, token) {
  const started = performance.now();
  try {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, 'X-Forwarded-For': nextAddress() } });
    const body = await res.arrayBuffer();
    return { status: res.status, ms: performance.now() - started, bytes: body.byteLength, body };
  } catch {
    return { status: 0, ms: performance.now() - started, bytes: 0, body: null };
  }
}

/** How many rows a list answer carries: an array, or the array an object wraps. */
function rowsOf(buffer) {
  try {
    const parsed = JSON.parse(Buffer.from(buffer).toString('utf8'));
    if (Array.isArray(parsed)) return parsed.length;
    for (const key of ['items', 'data', 'results', 'events', 'tasks', 'projects']) if (Array.isArray(parsed?.[key])) return parsed[key].length;
    return null;
  } catch { return null; }
}

// The list endpoints the pages load, as the role that loads them, and the single-record reads next to them.
const SCENARIOS = [
  { label: 'GET /tasks', as: 'owner', path: '/tasks', list: true },
  { label: 'GET /tasks', as: 'manager', path: '/tasks', list: true },
  { label: 'GET /tasks', as: 'employee', path: '/tasks', list: true },
  { label: 'GET /tasks?status=IN_PROGRESS', as: 'owner', path: '/tasks?status=IN_PROGRESS', list: true },
  { label: 'GET /tasks?projectId=…', as: 'owner', path: `/tasks?projectId=${s.project}`, list: true },
  { label: 'GET /projects', as: 'owner', path: '/projects', list: true },
  { label: 'GET /projects', as: 'employee', path: '/projects', list: true },
  { label: 'GET /files', as: 'owner', path: '/files', list: true },
  { label: 'GET /customers', as: 'owner', path: '/customers', list: true },
  { label: 'GET /labels', as: 'owner', path: '/labels', list: true },
  { label: 'GET /users/members', as: 'owner', path: '/users/members', list: true },
  { label: 'GET /notifications', as: 'employee', path: '/notifications', list: true },
  { label: 'GET /notifications/unread-count', as: 'employee', path: '/notifications/unread-count' },
  { label: 'GET /my-work', as: 'employee', path: '/my-work', list: true },
  { label: 'GET /audit-events', as: 'owner', path: '/audit-events', list: true },
  { label: 'GET /collaboration/notes', as: 'owner', path: '/collaboration/notes', list: true },
  { label: 'GET /collaboration/notes?task', as: 'owner', path: `/collaboration/notes?resourceType=task&resourceId=${s.commentedTask}`, list: true },
  { label: 'GET /search?q=colour', as: 'owner', path: '/search?q=colour', list: true },
  { label: 'GET /dashboards/workspace-summary', as: 'owner', path: '/dashboards/workspace-summary' },
  { label: 'GET /client/projects', as: 'client', path: '/client/projects', list: true },
  { label: 'GET /client/progress', as: 'client', path: '/client/progress', list: true },
  { label: 'GET /tasks/:id', as: 'owner', path: `/tasks/${s.task}` },
  { label: 'GET /tasks/:id/subtasks', as: 'owner', path: `/tasks/${s.task}/subtasks`, list: true },
  { label: 'GET /activity/task/:id', as: 'owner', path: `/activity/task/${s.task}`, list: true },
  { label: 'GET /projects/:id', as: 'owner', path: `/projects/${s.project}` },
  { label: 'GET /customers/:id/overview', as: 'owner', path: `/customers/${s.customer}/overview` },
];
const only = typeof args.only === 'string' ? args.only : null;

const results = [];
const startedAt = new Date().toISOString();
for (const sc of SCENARIOS.filter((x) => !only || x.label.includes(only))) {
  const token = await login(sc.as);
  const first = await once(sc.path, token);
  await once(sc.path, token); // warm-up, not counted
  const samples = [];
  const until = performance.now() + SECONDS * 1000;
  const begun = performance.now();
  await Promise.all(Array.from({ length: USERS }, async () => {
    while (performance.now() < until) { const r = await once(sc.path, token); samples.push({ status: r.status, ms: r.ms, bytes: r.bytes }); }
  }));
  const seconds = (performance.now() - begun) / 1000;
  const row = { label: sc.label, as: sc.as, list: Boolean(sc.list), rows: first.status === 200 && sc.list ? rowsOf(first.body) : null, firstStatus: first.status, ...summarise(samples, { seconds }) };
  results.push(row);
  console.log(`${row.label} as ${row.as}: ${row.ok}/${row.requests} ok, p50 ${row.p50} ms, p95 ${row.p95} ms, p99 ${row.p99} ms, rows ${row.rows ?? '-'}, statuses ${JSON.stringify(row.statuses)}`);
}
writeFileSync(args.out, JSON.stringify({ api: API, users: USERS, seconds: SECONDS, startedAt, finishedAt: new Date().toISOString(), counts: seed.counts, results }, null, 2));
console.log('\n' + markdownTable(results));
