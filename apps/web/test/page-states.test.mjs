/**
 * F04 — every workspace and client page has the four states.
 *
 * For each page that loads data this test reads the page and the components it
 * renders and requires: something shown while loading, a failed load shown,
 * the reason of a refusal reaching the screen (access denied), and - where the
 * page lists things - a sentence for "nothing here". Pages without data and
 * pages without a list are named below with the reason, and the lists must be
 * exact, so a new page cannot be added without being classified.
 * States added by F04 use the shared components in src/components/states.
 * The browser sweep (e2e/14-page-states.spec.ts) checks the same on screen.
 * Run: node --test test/page-states.test.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(p, 'utf8');

function pagesIn(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? pagesIn(path) : name === 'page.tsx' ? [path] : [];
  });
}
const pages = [...pagesIn(join(root, 'app/(workspace)')), ...pagesIn(join(root, 'app/(client)'))];
const route = (file) => relative(join(root, 'app'), file).replace(/\/page\.tsx$/, '');

/** The page plus the components it renders, three imports deep; shared chrome is not part of a page's states. */
const SHARED = ['/components/states/', '/components/layout/', '/components/navigation/', '/components/ui/', '/components/motion/', '/components/shell/'];
function resolveImport(spec, from) {
  const base = spec.startsWith('@/') ? join(root, 'src', spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  return [`${base}.tsx`, join(base, 'index.tsx')].find((c) => existsSync(c)) ?? null;
}
function tree(file, depth = 3, seen = []) {
  if (seen.includes(file)) return seen;
  seen.push(file);
  if (depth === 0) return seen;
  for (const [, spec] of read(file).matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const next = resolveImport(spec, file);
    if (next && !SHARED.some((s) => next.includes(s))) tree(next, depth - 1, seen);
  }
  return seen;
}
const sourceOf = (file) => tree(file).map(read).join('\n');

/** Pages that load nothing themselves: a redirect, a static page, or a shell around another route. */
const NO_DATA = {
  '(client)/client/files': 'redirect',
  '(client)/client/payments': 'redirect',
  '(client)/client/projects': 'redirect',
  '(client)/client/projects/[id]': 'redirect',
  '(client)/client/tasks': 'redirect',
  '(client)/client/tasks/[id]': 'redirect',
  '(workspace)/dashboard/admin/company-access': 'redirect',
  '(workspace)/dashboard/admin/invites': 'redirect',
  '(workspace)/dashboard/admin/users/requests': 'redirect',
  '(workspace)/denied': 'static',
  '(workspace)/team': 'redirect',
};
/** Pages that show one record, an overview or a form: there is no list that could be empty. */
const NO_LIST = {
  '(client)/client/deliveries/[id]': 'one delivery',
  '(client)/client/problems/[id]': 'one report',
  '(client)/client/requests/[id]': 'one request',
  '(workspace)/approvals/[id]': 'one approval',
  '(workspace)/crm': 'four numbers',
  '(workspace)/crm/leads/[id]': 'one lead',
  '(workspace)/crm/opportunities/[id]': 'one opportunity',
  '(workspace)/data': 'export and import forms',
  '(workspace)/finance': 'totals',
  '(workspace)/reports/[id]': 'one report',
  '(workspace)/settings': 'profile form',
  '(workspace)/voice/[id]': 'one voice note',
  '(workspace)/voice/task-drafts/[id]': 'one draft',
};
/**
 * Pages that only read the signed-in person's own data, chosen by their role: a refusal is
 * not one of their states. A part that cannot be read says that it could not be loaded.
 */
const OWN_DATA = {
  '(workspace)/dashboard': 'sections are chosen by role; a section that fails says "Could not load this section."',
  '(workspace)/settings': "the person's own profile",
  '(client)/client': "the client's own overview; a part that fails says \"could not be loaded\"",
};
/** Pages that load nothing when they open; requests start from a button and report their own result. */
const NO_INITIAL_LOAD = { '(workspace)/data': 'export and import start from a button; the buttons show their own progress' };

const LOADS = /\bapi(Fetch|Blob|Upload)\b/;
const LOADING = /Loading|<LoadingState|Skeleton|animate-pulse|'loading'/;
const FAILURE = /<ErrorState|role="alert"|=== 'error'|\{[A-Za-z]*[eE]rror\b[^}\n]*&&/;
const REFUSAL = /\.message\b|<DeniedState|FORBIDDEN_MESSAGE|Access denied/;
const EMPTY = /<EmptyState|No [A-Za-z ]+(yet|found|planned|scheduled|right now)|Nothing |not [a-z]+ anything yet|length === 0|empty=/;

describe('F04 — the four states on every workspace and client page', () => {
  const data = pages.filter((p) => LOADS.test(sourceOf(p)));

  it('every page is classified: it loads data, or it is named as a page without data', () => {
    const without = pages.filter((p) => !data.includes(p)).map(route).sort();
    assert.deepEqual(without, Object.keys(NO_DATA).sort());
  });

  it('loading: every page that loads data shows that it is loading', () => {
    const missing = data.filter((p) => !(route(p) in NO_INITIAL_LOAD) && !LOADING.test(sourceOf(p))).map(route);
    assert.deepEqual(missing, []);
  });

  it('error: every page that loads data shows a failed load', () => {
    const missing = data.filter((p) => !FAILURE.test(sourceOf(p))).map(route);
    assert.deepEqual(missing, []);
  });

  it('access denied: the reason of a refusal reaches the screen on every page that loads data, except the named own-data pages', () => {
    const without = data.filter((p) => !REFUSAL.test(sourceOf(p))).map(route).sort();
    assert.deepEqual(without, Object.keys(OWN_DATA).sort());
  });

  it('empty: every page with a list says when there is nothing; the pages without a list are named', () => {
    const without = data.filter((p) => !EMPTY.test(sourceOf(p))).map(route).sort();
    const named = Object.keys(NO_LIST).sort();
    assert.deepEqual(without.filter((r) => !named.includes(r)), [], 'a page with a list has no empty sentence');
    for (const r of named) assert.ok(data.some((p) => route(p) === r), `${r} is named in NO_LIST but is not a data page`);
  });

  it('the states F04 added use the shared components', () => {
    const chat = read(join(root, 'app/(workspace)/chat/page.tsx'));
    assert.match(chat, /from '@\/components\/states\/loading-state'/);
    assert.match(chat, /<LoadingState label="Loading channels" \/>/);
    assert.match(chat, /<LoadingState label="Loading messages" \/>/);
    assert.match(chat, /<ErrorState title="Channels could not be loaded"/);
    assert.match(read(join(root, 'app/(workspace)/files/page.tsx')), /<ErrorState title="The files could not be loaded"[^>]*onRetry=/);
  });

  it('"Loading" ends when the load failed, and an empty sentence is not shown beside a failure', () => {
    for (const file of ['app/(workspace)/complaints/page.tsx', 'app/(workspace)/requests/page.tsx']) {
      assert.match(read(join(root, file)), /items === null && !error && <p[^>]*>Loading…/, file);
    }
    assert.match(read(join(root, 'src/components/team/invitations-panel.tsx')), /pageError \? null : invites\.length === 0/);
    assert.match(read(join(root, 'app/(workspace)/files/page.tsx')), /!loading && !loadError && files\.length === 0/);
    assert.match(read(join(root, 'app/(workspace)/chat/page.tsx')), /!channelsLoading && !channelsError && channels\.length === 0/);
  });

  it('the browser sweep covers every page that needs no record id', () => {
    const spec = read(join(root, 'e2e/14-page-states.spec.ts'));
    const listed = new Set([...spec.matchAll(/'((?:client)?[a-z/-]*)'/g)].map((m) => m[1]));
    const staticRoutes = data.map(route).filter((r) => !r.includes('[')).map((r) => r.replace(/^\((workspace|client)\)\//, ''));
    const missing = staticRoutes.filter((r) => !listed.has(r) && !(`(workspace)/${r}` in NO_INITIAL_LOAD));
    assert.deepEqual(missing, []);
  });
});
