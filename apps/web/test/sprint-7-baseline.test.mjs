import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readWeb = (relativePath) => readFileSync(join(webRoot, relativePath), 'utf8');
const existsWeb = (relativePath) => existsSync(join(webRoot, relativePath));

function listFiles(relativePath) {
  const absolutePath = join(webRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return readdirSync(absolutePath).flatMap((entry) => {
    const childPath = join(relativePath, entry);
    const fullPath = join(webRoot, childPath);

    if (statSync(fullPath).isDirectory()) {
      return listFiles(childPath);
    }

    return [childPath];
  });
}

describe('Sprint 7 chat, notifications, and realtime frontend baseline', () => {
  it('adds chat and notification workspace pages', () => {
    const routes = [
      'app/(workspace)/chat/page.tsx',
      'app/(workspace)/notifications/page.tsx',
    ];

    for (const route of routes) {
      assert.equal(existsWeb(route), true, `${route} should exist`);
    }
  });

  it('adds required chat, realtime, and notification components', () => {
    const components = [
      'src/components/chat/chat-channel-list.tsx',
      'src/components/chat/chat-message-list.tsx',
      'src/components/chat/chat-composer.tsx',
      'src/components/chat/chat-scope-badge.tsx',
      'src/components/chat/realtime-status-notice.tsx',
      'src/components/notifications/notification-list.tsx',
      'src/components/notifications/notification-badge.tsx',
    ];

    for (const component of components) {
      assert.equal(existsWeb(component), true, `${component} should exist`);
    }
  });

  it('adds internal navigation for chat and notifications without exposing them to clients', () => {
    const workspaceNavigation = readWeb('src/navigation/navigation.ts');
    const clientNavigation = readWeb('src/navigation/client-navigation.ts');

    assert.match(workspaceNavigation, /id: 'chat'/);
    assert.match(workspaceNavigation, /href: '\/chat'/);
    assert.match(workspaceNavigation, /id: 'notifications'/);
    assert.match(workspaceNavigation, /href: '\/notifications'/);
    assert.match(workspaceNavigation, /allowedRoles: \['OWNER', 'MANAGER', 'EMPLOYEE'\]/);
    assert.doesNotMatch(clientNavigation, /chat/i);
    assert.doesNotMatch(clientNavigation, /notification/i);
    assert.doesNotMatch(clientNavigation, /message/i);
  });

  it('keeps internal chat and notifications out of client portal source', () => {
    const clientFiles = listFiles('app/(client)')
      .concat(listFiles('src/components/client-portal'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.doesNotMatch(clientFiles, /\/chat/);
    assert.doesNotMatch(clientFiles, /\/notifications/);
    assert.doesNotMatch(clientFiles, /ChatChannelList/);
    assert.doesNotMatch(clientFiles, /NotificationList/);
  });

  it('keeps deferred non-Sprint-7 features absent from new workspace source', () => {
    const sprint7Files = listFiles('app/(workspace)/chat')
      .concat(listFiles('app/(workspace)/notifications'))
      .concat(listFiles('src/components/chat'))
      .concat(listFiles('src/components/notifications'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.doesNotMatch(sprint7Files, /voice note/i);
    assert.doesNotMatch(sprint7Files, /\bAI\b/);
    assert.doesNotMatch(sprint7Files, /finance/i);
    assert.doesNotMatch(sprint7Files, /report/i);
    assert.doesNotMatch(sprint7Files, /automation/i);
    assert.doesNotMatch(sprint7Files, /email notification/i);
    assert.doesNotMatch(sprint7Files, /push notification/i);
    assert.doesNotMatch(sprint7Files, /mobile notification/i);
  });
});
