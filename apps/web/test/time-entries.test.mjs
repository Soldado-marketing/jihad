/**
 * Time & Costs UI (MAOS-T76) over the T72/T73/T74 APIs.
 * Run: node --test test/time-entries.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  canDecide, canLogTime, canReview, canSeeCost, canSubmit, createPayload, formatMinutes, formFrom, isEditable, listQuery, parseDuration, totals, updatePayload,
} from '../src/lib/time-entries.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');
const entry = (over = {}) => ({
  id: 'e1', date: '2026-10-16', minutes: 90, billable: true, note: null, status: 'DRAFT', projectId: 'p1', taskId: null,
  user: { id: 'u1', displayName: 'Ann' }, project: { id: 'p1', name: 'Site', projectNumber: 'P-0001' }, task: null, ...over,
});
const roles = ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT', undefined];

describe('time & costs UI', () => {
  it('role rules mirror the API: everyone internal logs, OWNER/MANAGER review, only OWNER sees cost', () => {
    assert.deepEqual(roles.map(canLogTime), [true, true, true, true, false, false]);
    assert.deepEqual(roles.map(canReview), [true, true, false, false, false, false]);
    assert.deepEqual(roles.map(canSeeCost), [true, false, false, false, false, false]);
  });

  it('only the member changes their own draft or rejected entry; reviewers decide submitted ones', () => {
    assert.equal(isEditable(entry(), 'u1'), true);
    assert.equal(isEditable(entry({ status: 'REJECTED' }), 'u1'), true);
    for (const status of ['SUBMITTED', 'APPROVED', 'BILLED']) assert.equal(isEditable(entry({ status }), 'u1'), false, status);
    assert.equal(isEditable(entry(), 'u2'), false, 'not own');
    assert.deepEqual([canSubmit(entry(), 'u1'), canSubmit(entry({ status: 'REJECTED' }), 'u1'), canSubmit(entry(), 'u2')], [true, false, false]);
    assert.deepEqual([canDecide(entry({ status: 'SUBMITTED' }), 'MANAGER'), canDecide(entry({ status: 'SUBMITTED' }), 'EMPLOYEE'), canDecide(entry(), 'OWNER')], [true, false, false]);
  });

  it('reads durations as whole minutes 1-1440 and never rounds', () => {
    for (const [input, minutes] of [['90', 90], ['1:30', 90], ['1.5', 90], ['1,25', 75], ['0:01', 1], ['24:00', 1440], [' 45 ', 45]]) assert.equal(parseDuration(input), minutes, input);
    for (const input of ['0', '1441', '24:01', '1:60', '1.333', '1.33', '0.01', 'abc', '', '-30', '1:5']) assert.equal(parseDuration(input), null, input);
    assert.deepEqual([formatMinutes(90), formatMinutes(5), formatMinutes(1440)], ['1:30', '0:05', '24:00']);
  });

  it('totals use stored costs only and count unrated minutes separately', () => {
    const t = totals([entry({ minutes: 60, costCents: 6000 }), entry({ minutes: 30, billable: false, costCents: null }), entry({ minutes: 15 })]);
    assert.deepEqual(t, { minutes: 105, billableMinutes: 75, costCents: 6000, unratedMinutes: 45 });
  });

  it('sends a create body without member, status, rate or cost', () => {
    const r = createPayload({ date: '2026-10-16', duration: '1:30', projectId: 'p1', taskId: '', billable: false, note: ' x ' });
    assert.deepEqual(r, { ok: true, body: { date: '2026-10-16', minutes: 90, projectId: 'p1', billable: false, note: 'x' } });
    for (const k of ['userId', 'status', 'rateCents', 'costCents', 'customerId']) assert.ok(!(k in r.body), k);
    assert.equal(createPayload({ date: '2026-02-30', duration: '1', projectId: 'p1', taskId: '', billable: true, note: '' }).ok, false);
    assert.equal(createPayload({ date: '2026-10-16', duration: '1441', projectId: 'p1', taskId: '', billable: true, note: '' }).ok, false);
    assert.equal(createPayload({ date: '2026-10-16', duration: '30', projectId: '', taskId: '', billable: true, note: '' }).ok, false);
  });

  it('sends only changed fields on edit and clears with null', () => {
    const before = entry({ taskId: 't1', note: 'old' });
    assert.deepEqual(updatePayload(before, formFrom(before)), { ok: true, body: {} });
    assert.deepEqual(updatePayload(before, { ...formFrom(before), duration: '2:00', taskId: '', note: '' }), { ok: true, body: { minutes: 120, taskId: null, note: null } });
    assert.equal(listQuery({ from: '2026-10-01', to: '', status: 'DRAFT' }), '?from=2026-10-01&status=DRAFT');
    assert.equal(listQuery({}), '');
  });

  it('pages show money only behind the owner checks and flag unrated time', () => {
    const page = read('app/(workspace)/time/page.tsx');
    assert.match(page, /\.\.\.\(owner\s*\? \[\{\s*key: 'cost'/);
    assert.match(page, /\{owner && <div><dt className="text-xs text-muted">Labour cost/);
    assert.match(page, /applyFilters\(\s*entries,\s*filters,\s*\(e, key\) =>[\s\S]*key === 'note' \? e\.note/, 'every searchable key resolves (F-5)');
    const project = read('app/(workspace)/projects/[id]/page.tsx');
    assert.match(project, /\{canSeeBudget\(role\) && <ProjectProfitabilityPreview projectId=\{project\.id\} \/>\}/);
    const preview = read('src/components/projects/project-profitability-preview.tsx');
    assert.match(preview, /\.catch\(\(\) => !cancelled && setState\('hidden'\)\)/, 'renders nothing when the API refuses');
    assert.match(preview, /row\.incomplete && \(/);
    const finance = read('app/(workspace)/finance/page.tsx');
    assert.match(finance, /summary\?\.incomplete && \(/);
    assert.match(finance, /summary\.incomplete \? '≥ ' : ''/);
  });

  it('is in the navigation and sidebar, never for clients', () => {
    assert.match(read('src/navigation/navigation.ts'), /id: 'time',[\s\S]*?allowedRoles: \['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'\],[\s\S]*?clientSafe: false/);
    assert.match(read('src/components/shell/sidebar.tsx'), /'tasks', 'time', 'customers'/);
  });
});
