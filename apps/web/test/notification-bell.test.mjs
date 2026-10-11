/**
 * Notification bell in the workspace top bar (MAOS-T48).
 * Run: node --test test/notification-bell.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseUnreadCount, unreadBadgeLabel } from '../src/lib/notifications.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');

describe('notification bell', () => {
  it('reads the unread count defensively', () => {
    assert.equal(parseUnreadCount(3), 3);
    assert.equal(parseUnreadCount('7'), 7);
    for (const bad of [undefined, null, '', 'oops', -1, 2.5, '<html>']) assert.equal(parseUnreadCount(bad), 0, String(bad));
  });

  it('shows no badge at zero and caps it at 9+', () => {
    assert.equal(unreadBadgeLabel(0), '');
    assert.equal(unreadBadgeLabel(4), '4');
    assert.equal(unreadBadgeLabel(10), '9+');
  });

  it('is mounted in the workspace top bar and uses only the caller-scoped endpoints', () => {
    assert.match(read('src/components/shell/topbar.tsx'), /<NotificationBell \/>/);
    const bell = read('src/components/notifications/notification-bell.tsx');
    const paths = [...bell.matchAll(/apiFetch(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(paths)].sort(), ['/notifications', '/notifications/${id}/read', '/notifications/unread-count']);
    assert.match(bell, /aria-label=/);
  });
});
