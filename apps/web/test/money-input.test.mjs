/**
 * Money entered in the browser becomes integer cents without a float.
 * Run: node --test test/money-input.test.mjs
 *
 * The payments page sent `Number(amount) * 100`, which turns 19.99 into
 * 1998.9999999999998 - rejected by the API, and a float on an authoritative
 * amount. Every form must use toCents (src/lib/money.ts).
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { toCents } from '../src/lib/money.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') || p.endsWith('.ts') ? [p] : [];
  });

describe('money input', () => {
  it('converts decimal amounts to exact integer cents', () => {
    assert.equal(toCents('19.99'), 1999);
    assert.equal(toCents('0.29'), 29);
    assert.equal(toCents('1.005'), null);
    assert.equal(toCents('12'), 1200);
  });

  it('no page converts an amount with a float multiplication', () => {
    // src/lib/money.ts is the one place allowed to multiply: it scales the
    // integer whole part only. Comments are ignored.
    const code = (f) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    const offenders = [...walk(join(webRoot, 'app')), ...walk(join(webRoot, 'src'))]
      .filter((f) => !f.endsWith(join('src', 'lib', 'money.ts')))
      .filter((f) => /Number\([^)]*\)\s*\*\s*100|parseFloat\([^)]*\)\s*\*\s*100/.test(code(f)));
    assert.deepEqual(offenders, []);
  });

  it('the payments page uses toCents', () => {
    const page = readFileSync(join(webRoot, 'app/(workspace)/finance/payments/page.tsx'), 'utf8');
    assert.match(page, /toCents\(form\.amountCents\)/);
  });
});
