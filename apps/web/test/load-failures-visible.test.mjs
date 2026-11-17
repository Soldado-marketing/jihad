/**
 * F04 — a failed load is never shown as "nothing here", zero or "not found".
 *
 * Pages used to swallow a failed request (`.catch(() => setItems([]))`,
 * `catch { }`) and then render their empty state, so a server error or a lost
 * connection looked like "No revenue records yet." This test reads the source
 * of every page and component and fails on a swallowed failure that is not
 * listed below with its reason. To add one, it must be harmless when it fails:
 * the page still tells the truth without it.
 * Run: node --test test/load-failures-visible.test.mjs
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SWALLOWED = /\.catch\(\(\)\s*=>\s*(\{\s*\}|undefined|null|set[A-Za-z]+\(\[\]\)|set[A-Za-z]+\(null\)|\[\]|void 0)\)|catch\s*\{\s*(\/\*[^*]*\*\/)?\s*\}|catch\s*\([a-z_]*\)\s*\{\s*\}/;

function tsx(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? tsx(path) : name.endsWith('.tsx') ? [path] : [];
  });
}
const files = [...tsx(join(root, 'app')), ...tsx(join(root, 'src/components'))];
const swallowedIn = (path) => readFileSync(path, 'utf8').split('\n').filter((line) => SWALLOWED.test(line)).length;

/**
 * The swallowed failures that are allowed to stay, with how many per file and why.
 *  options    a list that only fills a dropdown; the form says nothing untrue without it
 *  permission optional data the role may not be allowed to read
 *  action     a background action; when it fails the page stays as it was
 *  reload     a refresh after an action; the data already on screen stays
 *  fallback   falls back to data that was already loaded
 *  unused     a component no page renders
 */
const ALLOWED = {
  'app/(client)/client/notifications/page.tsx': [2, 'action', 'marking as read'],
  'app/(client)/client/problems/page.tsx': [1, 'options', 'deliveries to refer to'],
  'app/(client)/client/requests/page.tsx': [1, 'options', 'deliveries to refer to'],
  'app/(workspace)/crm/opportunities/page.tsx': [1, 'options', 'leads to link'],
  'app/(workspace)/dashboard/page.tsx': [1, 'permission', 'pending registrations, OWNER only; the card is hidden without them'],
  'app/(workspace)/files/[id]/page.tsx': [1, 'fallback', 'full version history; the detail response carries the newest versions'],
  'app/(workspace)/files/page.tsx': [2, 'options', 'projects and tasks to attach to'],
  'app/(workspace)/finance/invoices/page.tsx': [1, 'options', 'projects to bill'],
  'app/(workspace)/notifications/page.tsx': [2, 'action', 'marking as read'],
  'app/(workspace)/projects/[id]/page.tsx': [2, 'permission', 'customers and members for the edit form'],
  'app/(workspace)/tasks/page.tsx': [3, 'reload', 'tasks, files and labels after an action; the first load reports its failure'],
  'app/(workspace)/time/page.tsx': [2, 'options', 'projects and tasks to book time on'],
  'src/components/client-portal/client-project-detail.tsx': [1, 'unused', 'not rendered since the client project pages redirect'],
  'src/components/dashboard/workspace-summary-grid.tsx': [1, 'unused', 'not rendered; the dashboard page loads the summary itself and reports a failure'],
  'src/components/tasks/project-board.tsx': [4, 'options', 'members, projects, files and labels for the card editor'],
  'src/components/team/company-access-panel.tsx': [1, 'options', 'customers for a client membership'],
  'src/components/team/invitations-panel.tsx': [1, 'options', 'customers for a client invitation'],
};

describe('F04 — failed loads are visible', () => {
  it('no page or component swallows a failed request outside the reviewed list', () => {
    const found = Object.fromEntries(files.map((f) => [relative(root, f), swallowedIn(f)]).filter(([, n]) => n > 0));
    const problems = [];
    for (const [file, n] of Object.entries(found)) {
      const allowed = ALLOWED[file]?.[0] ?? 0;
      if (n > allowed) problems.push(`${file}: ${n} swallowed failure(s), ${allowed} reviewed`);
    }
    assert.deepEqual(problems, [], 'A failed request must be shown (ErrorState with a retry), or be added to ALLOWED with its reason.');
  });

  it('the reviewed list holds nothing that no longer exists', () => {
    const stale = Object.entries(ALLOWED).filter(([file, [n]]) => {
      try { return swallowedIn(join(root, file)) !== n; } catch { return true; }
    }).map(([file]) => file);
    assert.deepEqual(stale, [], 'Remove or correct these entries so the list stays exact.');
  });

  it('every reviewed entry names a known reason', () => {
    const reasons = new Set(['options', 'permission', 'action', 'reload', 'fallback', 'unused']);
    for (const [file, [n, reason, what]] of Object.entries(ALLOWED)) {
      assert.ok(Number.isInteger(n) && n > 0 && reasons.has(reason) && typeof what === 'string' && what.length > 5, file);
    }
  });

  const SHOWS_ERROR = [
    'app/(client)/client/notifications/page.tsx', 'app/(client)/client/problems/page.tsx', 'app/(client)/client/requests/page.tsx',
    'app/(client)/client/invoices/[id]/page.tsx', 'app/(workspace)/notifications/page.tsx', 'app/(workspace)/finance/revenue/page.tsx',
    'app/(workspace)/finance/costs/page.tsx', 'app/(workspace)/finance/invoices/[id]/page.tsx', 'app/(workspace)/crm/page.tsx',
    'app/(workspace)/crm/leads/[id]/page.tsx', 'app/(workspace)/crm/opportunities/[id]/page.tsx', 'app/(workspace)/collaboration/page.tsx',
    'app/(workspace)/voice/page.tsx', 'app/(workspace)/voice/[id]/page.tsx', 'app/(workspace)/voice/task-drafts/[id]/page.tsx',
    'app/(workspace)/chat/page.tsx', 'app/(workspace)/approvals/[id]/page.tsx', 'app/(workspace)/files/[id]/page.tsx',
    'app/(workspace)/reports/[id]/page.tsx', 'app/(workspace)/tasks/[id]/page.tsx',
    'src/components/dashboard/client-dashboard-summary.tsx',
    'src/components/files/client-delivery-panel.tsx', 'src/components/projects/project-appointments-panel.tsx',
  ];
  it('the pages and components fixed in F04 show the shared ErrorState with a retry', () => {
    for (const file of SHOWS_ERROR) {
      const src = readFileSync(join(root, file), 'utf8');
      assert.match(src, /from '@\/components\/states\/error-state'/, `${file}: ErrorState import`);
      assert.match(src, /<ErrorState [^>]*onRetry=/, `${file}: ErrorState with onRetry`);
    }
  });

  it('the client overview never claims "all paid" or "all set" for a part that failed to load', () => {
    const src = readFileSync(join(root, 'src/components/dashboard/client-dashboard-summary.tsx'), 'utf8');
    assert.match(src, /failed\.size === 0 && actions\.length === 0/);
    assert.match(src, /failed\.has\('invoices'\) \? NOT_LOADED/);
    assert.match(src, /failed\.has\('invoices'\) \? '—' : money\(/);
  });
});
