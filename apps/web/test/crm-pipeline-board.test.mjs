/**
 * CRM pipeline board (MAOS-T62).
 * Run: node --test test/crm-pipeline-board.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { groupByStage, isPipelineStage, PIPELINE_STAGES } from '../src/lib/pipeline.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe('pipeline grouping', () => {
  const items = [
    { id: '1', status: 'LEAD', valueCents: 150000, currency: 'EUR' },
    { id: '2', status: 'LEAD', valueCents: 50, currency: 'eur' },
    { id: '3', status: 'LEAD', valueCents: 20000, currency: 'USD' },
    { id: '4', status: 'WON', valueCents: null },
    { id: '5', status: 'PROPOSAL' },
    { id: '6', status: 'UNKNOWN', valueCents: 999 },
  ];
  const cols = groupByStage(items);

  it('returns all seven stages in sales order, empty ones included', () => {
    assert.deepEqual(cols.map((c) => c.status), PIPELINE_STAGES.map((s) => s.status));
    assert.equal(cols.find((c) => c.status === 'NEGOTIATION').count, 0);
  });

  it('counts per stage and sums value per currency, never across currencies', () => {
    const lead = cols.find((c) => c.status === 'LEAD');
    assert.equal(lead.count, 3);
    assert.deepEqual(lead.totals, [['EUR', 150050], ['USD', 20000]]);
    assert.deepEqual(cols.find((c) => c.status === 'WON').totals, []);
  });

  it('leaves out items with an unknown stage', () => {
    assert.equal(cols.reduce((n, c) => n + c.count, 0), 5);
    assert.equal(isPipelineStage('UNKNOWN'), false);
  });
});

describe('pipeline board wiring', () => {
  it('the opportunities page offers the board and moves cards through the validated PATCH', () => {
    const page = readFileSync(join(webRoot, 'app/(workspace)/crm/opportunities/page.tsx'), 'utf8');
    assert.match(page, /<PipelineBoard items=\{items\} onMove=\{moveTo\} \/>/);
    assert.match(page, /method: 'PATCH', body: JSON\.stringify\(\{ status \}\)/);
    assert.match(page, /setItems\(previous\)/, 'a failed move must roll back');
  });

  it('every card has a keyboard-accessible stage selector and values use integer formatting', () => {
    const board = readFileSync(join(webRoot, 'src/components/crm/pipeline-board.tsx'), 'utf8');
    assert.match(board, /aria-label=\{`Stage of \$\{o\.title\}`\}/);
    assert.match(board, /formatCents/);
    assert.doesNotMatch(board, /\/ 100/);
  });
});
