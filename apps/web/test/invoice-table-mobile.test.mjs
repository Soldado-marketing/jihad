/**
 * Invoice lists on a 375 px phone (MAOS F01): no horizontal page overflow.
 * The workspace list shows one card per invoice under md and the table from
 * md up, with the same fields in both; the detail's line-item table scrolls
 * inside its own box; the client list is cards already.
 * Run: node --test test/invoice-table-mobile.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('the workspace invoice list', () => {
  const page = read('app/(workspace)/finance/invoices/page.tsx');
  const cards = page.slice(page.indexOf('<ul className="grid gap-3 md:hidden"'), page.indexOf('<div className="hidden md:block">'));
  const table = page.slice(page.indexOf('<div className="hidden md:block">'));

  it('renders cards under md and the table from md up, never both', () => {
    assert.match(page, /<ul className="grid gap-3 md:hidden" aria-label="Invoices">/);
    assert.match(page, /<div className="hidden md:block">\s*<table className="[^"]*" aria-label="Invoices">/);
    assert.equal((page.match(/<table/g) ?? []).length, 1);
    assert.doesNotMatch(table, /md:hidden/);
  });

  it('shows the same fields in both layouts and keeps the number as the way in', () => {
    for (const part of [/href=\{`\/finance\/invoices\/\$\{i\.id\}`\}/, /i\.project\?\.name/, /fmt\(i\.totalCents, i\.currency\)/, /i\.dueAt \? new Date\(i\.dueAt\)\.toLocaleDateString\(\)/, /STATUS_COLORS\[i\.status\]/]) {
      assert.match(cards, part, `cards: ${part}`);
      assert.match(table, part, `table: ${part}`);
    }
    assert.match(cards, /<dt className="text-xs uppercase text-muted">Total<\/dt>/);
    assert.match(cards, /<dt className="text-xs uppercase text-muted">Due<\/dt>/);
  });

  it('lets long numbers and project names wrap or truncate instead of widening the page', () => {
    assert.match(cards, /className="min-w-0 break-words [^"]*"/);
    assert.match(cards, /className="mt-1 truncate text-xs text-muted"/);
    assert.match(cards, /flex flex-wrap items-start justify-between gap-2/);
    assert.match(cards, /shrink-0 rounded-full/);
    assert.doesNotMatch(cards, /whitespace-nowrap|overflow-x-auto/);
  });
});

describe('the invoice detail', () => {
  it('scrolls the line-item table inside its own box, not the page', () => {
    const detail = read('app/(workspace)/finance/invoices/[id]/page.tsx');
    assert.match(detail, /<div className="mt-3 overflow-x-auto">\s*<table className="w-full min-w-\[28rem\] text-sm">/);
  });
});

describe('the client invoice list', () => {
  it('is a card list with wrapping rows and no table', () => {
    const page = read('app/(client)/client/invoices/page.tsx');
    assert.doesNotMatch(page, /<table/);
    assert.match(page, /<ul className="grid gap-3">/);
    assert.match(page, /sm:grid-cols-\[1fr_auto\]/, 'single column under sm');
    assert.match(page, /<span className="min-w-0">/);
    assert.match(page, /flex flex-wrap gap-x-4 gap-y-1/);
    assert.doesNotMatch(page, /whitespace-nowrap|overflow-x/);
  });
});
