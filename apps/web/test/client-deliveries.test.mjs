/**
 * Client deliveries in the web app (owner decision 2026-11-02): the client
 * reviews, approves or asks for changes in the portal and reads staff answers
 * as the company; staff send and resubmit from the file page. The API enforces
 * scope and identity; this keeps the UI honest.
 * Run: node --test test/client-deliveries.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { DELIVERY_STATUS_LABEL, threadLine } from '../src/lib/deliveries.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('client portal deliveries', () => {
  const list = read('app/(client)/client/deliveries/page.tsx');
  const detail = read('app/(client)/client/deliveries/[id]/page.tsx');

  it('is in the client navigation and uses only client routes', () => {
    assert.match(read('src/navigation/client-navigation.ts'), /href: '\/client\/deliveries'/);
    assert.match(list, /apiFetch<Delivery\[\]>\('\/client\/deliveries'\)/);
    assert.match(detail, /`\/client\/deliveries\/\$\{id\}\/decision`/);
    assert.match(detail, /`\/client\/files\/\$\{d\.file\.fileAssetId\}\/versions\/\$\{d\.file\.fileVersionId\}\/content/);
    assert.doesNotMatch(list + detail, /'\/approvals|'\/files|\/deliveries\/file\//);
  });

  it('asks for a comment before changes can be requested', () => {
    assert.match(detail, /disabled=\{busy \|\| note\.trim\(\)\.length < 2\}/);
  });

  it('names only the client and the company in the conversation', () => {
    assert.equal(threadLine('REQUEST_CHANGES', 'client', 'Acme Agency'), 'You requested changes');
    assert.equal(threadLine('REVISION_SENT', 'company', 'Acme Agency'), 'Acme Agency sent a revision');
    assert.equal(threadLine('DELIVERED', 'company', 'Acme Agency'), 'Acme Agency delivered');
    assert.doesNotMatch(detail, /displayName|email|requestedBy|decidedBy/);
    assert.equal(DELIVERY_STATUS_LABEL.REQUESTED, 'Ready for your review');
  });
});

describe('staff side', () => {
  it('sends and resubmits from the file page', () => {
    const panel = read('src/components/files/client-delivery-panel.tsx');
    assert.match(panel, /apiFetch<Round\[\]>\(`\/deliveries\/file\/\$\{fileAssetId\}`\)/);
    assert.match(panel, /apiFetch\('\/deliveries', \{/);
    assert.match(read('src/components/files/file-detail.tsx'), /<ClientDeliveryPanel /);
  });

  it('leaves client deliveries to the client in the approvals queue', () => {
    assert.match(read('app/(workspace)/approvals/page.tsx'), /a\.clientVisible && a\.fileAsset/);
  });
});

describe('client portal wording', () => {
  it('speaks to the client, not in technical terms, and shows no task counters', () => {
    const { readdirSync, statSync } = require('node:fs');
    const walk = (dir) => readdirSync(join(root, dir)).flatMap((n) => {
      const p = `${dir}/${n}`;
      return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
    });
    // The old task views are no longer reachable (the routes redirect to deliveries).
    const portal = [...walk('app/(client)'), ...walk('src/components/client-portal'), 'src/components/dashboard/client-dashboard-summary.tsx']
      .filter((f) => !/client-task-/.test(f)).map(read).join('\n');
    for (const phrase of [/Portal foundation/i, /suppressed/i, /Client finance view/i, /margin/i, /Reference:/, /Client-safe (view|workspace)/i, /Client-visible task/i, /visible to your account/i]) {
      assert.doesNotMatch(portal, phrase);
    }
    assert.doesNotMatch(read('src/components/dashboard/client-dashboard-summary.tsx'), /tasks|client-summary/);
  });
});
