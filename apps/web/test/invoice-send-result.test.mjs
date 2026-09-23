/**
 * Owner-facing notice after an invoice send.
 *
 * The API sends one message per recipient, so a send can be partial. A partial
 * send must read as a warning with the counts - never as a plain success.
 *
 * Imports the TypeScript helper directly (Node >= 22.18 strips types).
 * Run: node --test test/invoice-send-result.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { describeInvoiceSend } from '../src/lib/invoice-send-result.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const page = readFileSync(join(webRoot, 'app/(workspace)/finance/invoices/[id]/page.tsx'), 'utf8');

describe('invoice send notice', () => {
  it('reports a full send as success', () => {
    const out = describeInvoiceSend({ acceptedCount: 3, failedCount: 0, recipientCount: 3 });
    assert.equal(out.tone, 'success');
    assert.equal(out.text, 'Invoice sent to 3 recipient(s).');
  });

  it('reports a partial send as a warning with accepted and failed counts', () => {
    const out = describeInvoiceSend({ acceptedCount: 2, failedCount: 1, recipientCount: 3 });
    assert.equal(out.tone, 'warning');
    assert.match(out.text, /Partially sent/);
    assert.match(out.text, /2 of 3 recipient\(s\)/);
    assert.match(out.text, /1 could not be sent/);
    assert.doesNotMatch(out.text, /^Invoice sent to/);
  });

  it('warns that sending again reaches every recipient again', () => {
    const out = describeInvoiceSend({ acceptedCount: 1, failedCount: 1, recipientCount: 2 });
    assert.match(out.text, /Sending again emails every recipient again/);
  });

  it('still reads an older response without the counts as a full send', () => {
    const out = describeInvoiceSend({ recipientCount: 2 });
    assert.deepEqual(out, { text: 'Invoice sent to 2 recipient(s).', tone: 'success' });
  });

  it('the invoice page routes a warning to its own amber status line, not the green notice', () => {
    assert.match(page, /describeInvoiceSend\(result\)/);
    assert.match(page, /outcome\.tone === 'warning'\) setWarning\(outcome\.text\)/);
    assert.match(page, /role="status" className="[^"]*text-amber-700/);
  });
});
