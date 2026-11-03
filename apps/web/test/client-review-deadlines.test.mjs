/**
 * Client review deadlines (plan row D03): staff may give a delivery a review-by
 * time when sending it; the client reads it in My Work and on the delivery,
 * urgently inside the last 24 hours; the API reminds the client scope once.
 * Run: node --test test/client-review-deadlines.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { reviewByLine, reviewByToIso } from '../src/lib/deliveries.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const HOUR = 3600 * 1000;
const now = new Date('2026-11-03T10:00:00Z');
const plus = (h) => new Date(now.getTime() + h * HOUR).toISOString();

describe('review-by helpers', () => {
  it('says nothing when no date was set or the value is not a date', () => {
    assert.equal(reviewByLine(null, 'REQUESTED', now), null);
    assert.equal(reviewByLine(undefined, 'REQUESTED', now), null);
    assert.equal(reviewByLine('soon', 'REQUESTED', now), null);
  });

  it('is calm days ahead, urgent inside 24 hours and after the time', () => {
    const calm = reviewByLine(plus(72), 'REQUESTED', now);
    assert.match(calm.text, /^Review by /);
    assert.equal(calm.urgent, false);
    const soon = reviewByLine(plus(20), 'REQUESTED', now);
    assert.match(soon.text, /^Review due .* \(within 24 hours\)$/);
    assert.equal(soon.urgent, true);
    const late = reviewByLine(plus(-1), 'REQUESTED', now);
    assert.match(late.text, /^Review was due /);
    assert.equal(late.urgent, true);
  });

  it('stops pressing once the client has answered', () => {
    const done = reviewByLine(plus(-1), 'APPROVED', now);
    assert.match(done.text, /^Review was asked for by /);
    assert.equal(done.urgent, false);
    assert.equal(reviewByLine(plus(2), 'CHANGES_REQUESTED', now).urgent, false);
  });

  it('turns the picker value into the ISO string the API stores', () => {
    assert.equal(reviewByToIso(''), null);
    assert.equal(reviewByToIso('   '), null);
    assert.equal(reviewByToIso('not a date'), null);
    assert.equal(reviewByToIso('2026-11-05T14:30'), new Date('2026-11-05T14:30').toISOString());
  });
});

describe('review-by in the pages', () => {
  const panel = read('src/components/files/client-delivery-panel.tsx');
  const list = read('app/(client)/client/deliveries/page.tsx');
  const detail = read('app/(client)/client/deliveries/[id]/page.tsx');

  it('staff may set an optional review-by time when sending, and see it on the rounds', () => {
    assert.match(panel, /<input type="datetime-local" value=\{reviewBy\}/);
    assert.match(panel, /Ask the client to answer by \(optional\)/);
    assert.match(panel, /reminded once, 24 hours before it/);
    assert.match(panel, /\.\.\.\(reviewByToIso\(reviewBy\) \? \{ reviewBy: reviewByToIso\(reviewBy\) \} : \{\}\)/);
    assert.match(panel, /dueAt: string \| null;/);
    assert.match(panel, /reviewByLine\(r\.dueAt, r\.status\)/);
  });

  it('the client reads the date in My Work and on the delivery, urgently when close', () => {
    assert.match(list, /reviewByLine\(d\.reviewBy, d\.status\)/);
    assert.match(list, /due\.urgent \? 'font-medium text-amber-700' : 'text-muted'/);
    assert.match(detail, /reviewBy: string \| null;/);
    assert.match(detail, /reviewByLine\(d\.reviewBy, d\.status\)/);
    assert.match(detail, /due\.urgent \? 'font-medium text-amber-700' : 'text-slate-600'/);
    assert.match(read('src/lib/client-portal.ts'), /reviewBy\?: string \| null;/);
  });

  it('keeps the client on client routes and names no staff', () => {
    assert.doesNotMatch(list + detail, /'\/approvals|'\/files|\/deliveries\/file\//);
    assert.doesNotMatch(list + detail, /displayName|email|requestedBy|decidedBy/);
  });
});
