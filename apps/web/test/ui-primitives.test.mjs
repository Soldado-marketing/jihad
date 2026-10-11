/**
 * Shared UI primitives (MAOS-T61): status vocabulary, StatusBadge reuse,
 * ErrorState, DetailPanel and KpiCard contracts.
 * Run: node --test test/ui-primitives.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { statusLabel, statusTone, TONE_CLASSES } from '../src/lib/status.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');

describe('status vocabulary', () => {
  it('gives the same meaning the same tone across domains', () => {
    for (const s of ['DONE', 'COMPLETED', 'WON', 'PAID', 'APPROVED']) assert.equal(statusTone(s), 'success', s);
    for (const s of ['BLOCKED', 'LOST', 'OVERDUE', 'FAILED', 'VOID']) assert.equal(statusTone(s), 'danger', s);
    for (const s of ['IN_REVIEW', 'DRAFT', 'PENDING_APPROVAL']) assert.equal(statusTone(s), 'warning', s);
    assert.equal(statusTone('in_progress'), 'info');
    assert.equal(statusTone('SOMETHING_NEW'), 'neutral');
  });

  it('turns enum values into readable labels', () => {
    assert.equal(statusLabel('IN_PROGRESS'), 'In progress');
    assert.equal(statusLabel('PARTIALLY_PAID'), 'Partially paid');
    assert.equal(statusLabel('TODO'), 'To do');
    assert.equal(statusLabel(''), '—');
  });

  it('defines classes for every tone', () => {
    for (const tone of ['neutral', 'info', 'success', 'warning', 'danger']) assert.ok(TONE_CLASSES[tone], tone);
  });
});

describe('primitive contracts', () => {
  it('task and pipeline badges delegate to the one StatusBadge', () => {
    for (const p of ['src/components/tasks/status-badge.tsx', 'src/components/crm/pipeline-badge.tsx']) {
      assert.match(read(p), /from '@\/components\/ui\/status-badge'/, p);
    }
  });

  it('ErrorState announces itself and offers a retry; payments uses it', () => {
    const src = read('src/components/states/error-state.tsx');
    assert.match(src, /role="alert"/);
    assert.match(src, /onRetry/);
    assert.match(read('app/(workspace)/finance/payments/page.tsx'), /<ErrorState/);
  });

  it('DetailPanel is a modal dialog that closes on Escape and returns focus', () => {
    const src = read('src/components/ui/detail-panel.tsx');
    assert.match(src, /role="dialog"/);
    assert.match(src, /aria-modal="true"/);
    assert.match(src, /e\.key === 'Escape'/);
    assert.match(src, /previous\?\.focus/);
  });

  it('KpiCard never colours a change without saying whether it is good', () => {
    assert.match(read('src/components/ui/kpi-card.tsx'), /delta\.good \? 'text-accent' : 'text-danger'/);
  });
});
