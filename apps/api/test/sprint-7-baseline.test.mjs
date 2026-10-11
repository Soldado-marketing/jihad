import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertGuardedController, assertTenantScopedRepository } from './support/source-assertions.mjs';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readApi = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');
const existsApi = (relativePath) => existsSync(join(apiRoot, relativePath));

describe('Sprint 7 chat, notifications, and realtime API baseline', () => {
  it('adds chat and notification data models with tenant scope', () => {
    const schema = readApi('prisma/schema.prisma');
    const models = ['ChatChannel', 'ChatMembership', 'ChatMessage', 'Notification'];
    const enums = ['ChatChannelType', 'NotificationStatus'];

    for (const model of models) {
      assert.match(schema, new RegExp(`model ${model} \\{`));
      const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
      assert.match(block, /tenantId\s+String/);
      assert.match(block, /@@index\(\[tenantId/);
    }

    for (const prismaEnum of enums) {
      assert.match(schema, new RegExp(`enum ${prismaEnum} \\{`));
    }

    assert.match(schema, /INTERNAL/);
    assert.match(schema, /CLIENT/);
    assert.match(schema, /UNREAD/);
    assert.match(schema, /READ/);
  });

  // The unused realtime gateway placeholder was removed in MAOS-T38.
  it('adds chat and notification modules', () => {
    const requiredFiles = [
      'src/modules/chat/chat.controller.ts',
      'src/modules/chat/chat.service.ts',
      'src/modules/chat/chat.repository.ts',
      'src/modules/chat/chat.module.ts',
      'src/modules/notifications/notifications.controller.ts',
      'src/modules/notifications/notifications.service.ts',
      'src/modules/notifications/notifications.repository.ts',
      'src/modules/notifications/notifications.module.ts',
    ];

    for (const file of requiredFiles) {
      assert.equal(existsApi(file), true, `${file} should exist`);
    }

    const appModule = readApi('src/app.module.ts');
    assert.match(appModule, /ChatModule/);
    assert.match(appModule, /NotificationsModule/);
    assert.doesNotMatch(appModule, /RealtimeModule/);
  });

  it('adds REST-first chat and notification endpoint skeletons', () => {
    const chatController = readApi('src/modules/chat/chat.controller.ts');
    const notificationsController = readApi('src/modules/notifications/notifications.controller.ts');

    assert.match(chatController, /@Controller\('chat'\)/);
    assert.match(chatController, /@Get\('channels'\)/);
    assert.match(chatController, /@Post\('channels'\)/);
    // MAOS-T39: the path parameter is named channelId.
    assert.match(chatController, /@Get\('channels\/:channelId\/messages'\)/);
    assert.match(chatController, /@Post\('channels\/:channelId\/messages'\)/);
    assert.match(notificationsController, /@Controller\('notifications'\)/);
    assert.match(notificationsController, /@Get\(\)/);
    assert.match(notificationsController, /@Patch\(':id\/read'\)/);
  });

  it('uses permission guard and Sprint 7 permission resources on protected routes', () => {
    // MAOS-T39: chat is permission-controlled; notifications are SELF-scoped
    // (authentication only, every call keyed on the caller's own user id).
    assertGuardedController(assert, readApi('src/modules/chat/chat.controller.ts'), 'chat.controller.ts');
    const notifications = readApi('src/modules/notifications/notifications.controller.ts');
    assert.match(notifications, /@UseGuards\(JwtAuthGuard\)/);
    for (const call of notifications.match(/this\.svc\.\w+\([^)]*\)/g) ?? []) {
      assert.match(call, /user\.tenantId, user\.sub/);
    }
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    assert.match(permissionTypes, /CHAT_CHANNEL/);
    assert.match(permissionTypes, /CHAT_MESSAGE/);
    assert.match(permissionTypes, /NOTIFICATION/);
    assert.match(permissionTypes, /REALTIME_SUBSCRIPTION/);
  });

  it('keeps chat and notification repositories tenant-aware without direct unscoped access', () => {
    // MAOS-T39: every query carries a tenantId boundary (see support helper).
    for (const path of ['src/modules/chat/chat.repository.ts', 'src/modules/notifications/notifications.repository.ts']) {
      assertTenantScopedRepository(assert, readApi(path), path);
    }
  });

  it('keeps chat internal by default and realtime out until it is built', () => {
    // MAOS-T39: channels are INTERNAL unless created otherwise, and the portal
    // has no chat route (asserted below). MAOS-T38 removed the realtime
    // placeholder gateway.
    const chatRepository = readApi('src/modules/chat/chat.repository.ts');
    assert.match(chatRepository, /type: ChatChannelType = ChatChannelType\.INTERNAL/);
    assert.equal(existsApi('src/modules/realtime'), false);
  });

  it.todo('writes audit events for chat and notification actions (specified in Sprint 7, never built; backlog F-4)');

  it('keeps internal chat out of client portal and post-Sprint-7 deferred modules absent', () => {
    const clientController = readApi('src/modules/client-portal/client-portal.controller.ts');
    const appModule = readApi('src/app.module.ts');

    assert.doesNotMatch(clientController, /chat/i);
    assert.doesNotMatch(clientController, /notifications/i);
    assert.match(appModule, /ChatModule/);
    assert.match(appModule, /NotificationsModule/);
    assert.doesNotMatch(appModule, /VoiceModule/);
    assert.doesNotMatch(appModule, /AiModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
  });
});
