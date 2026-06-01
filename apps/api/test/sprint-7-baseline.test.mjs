import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

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

  it('adds chat, notification, and realtime placeholder modules', () => {
    const requiredFiles = [
      'src/modules/chat/chat.controller.ts',
      'src/modules/chat/chat.service.ts',
      'src/modules/chat/chat.repository.ts',
      'src/modules/chat/chat.module.ts',
      'src/modules/notifications/notifications.controller.ts',
      'src/modules/notifications/notifications.service.ts',
      'src/modules/notifications/notifications.repository.ts',
      'src/modules/notifications/notifications.module.ts',
      'src/modules/realtime/realtime-gateway.placeholder.ts',
      'src/modules/realtime/realtime.module.ts',
    ];

    for (const file of requiredFiles) {
      assert.equal(existsApi(file), true, `${file} should exist`);
    }

    const appModule = readApi('src/app.module.ts');
    assert.match(appModule, /ChatModule/);
    assert.match(appModule, /NotificationsModule/);
    assert.match(appModule, /RealtimeModule/);
  });

  it('adds REST-first chat and notification endpoint skeletons', () => {
    const chatController = readApi('src/modules/chat/chat.controller.ts');
    const notificationsController = readApi('src/modules/notifications/notifications.controller.ts');

    assert.match(chatController, /@Controller\('chat'\)/);
    assert.match(chatController, /@Get\('channels'\)/);
    assert.match(chatController, /@Post\('channels'\)/);
    assert.match(chatController, /@Get\('channels\/:id\/messages'\)/);
    assert.match(chatController, /@Post\('channels\/:id\/messages'\)/);
    assert.match(notificationsController, /@Controller\('notifications'\)/);
    assert.match(notificationsController, /@Get\(\)/);
    assert.match(notificationsController, /@Patch\(':id\/read'\)/);
  });

  it('uses permission guard and Sprint 7 permission resources on protected routes', () => {
    const controllers = [
      readApi('src/modules/chat/chat.controller.ts'),
      readApi('src/modules/notifications/notifications.controller.ts'),
    ].join('\n');
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    assert.match(controllers, /@UseGuards\(PermissionGuard\)/);
    assert.match(controllers, /RequirePermission/);
    assert.match(permissionTypes, /CHAT_CHANNEL/);
    assert.match(permissionTypes, /CHAT_MESSAGE/);
    assert.match(permissionTypes, /NOTIFICATION/);
    assert.match(permissionTypes, /REALTIME_SUBSCRIPTION/);
  });

  it('keeps chat and notification repositories tenant-aware without direct unscoped access', () => {
    const repositories = [
      readApi('src/modules/chat/chat.repository.ts'),
      readApi('src/modules/notifications/notifications.repository.ts'),
    ].join('\n');

    assert.match(repositories, /extends TenantAwareRepository/);
    assert.match(repositories, /requireTenantContext/);
    assert.doesNotMatch(repositories, /prisma\./);
  });

  it('preserves internal and client channel separation plus realtime authorization placeholders', () => {
    const chatRepository = readApi('src/modules/chat/chat.repository.ts');
    const realtimeGateway = readApi('src/modules/realtime/realtime-gateway.placeholder.ts');

    assert.match(chatRepository, /type: 'INTERNAL'/);
    assert.match(chatRepository, /type: 'CLIENT'/);
    assert.match(chatRepository, /clientScopeKey/);
    assert.match(realtimeGateway, /authenticateConnectionPlaceholder/);
    assert.match(realtimeGateway, /authorizeSubscriptionPlaceholder/);
    assert.match(realtimeGateway, /handleSessionRevocationPlaceholder/);
    assert.match(realtimeGateway, /payloadPolicy: 'minimal-reference-only'/);
    assert.match(realtimeGateway, /realtime\.subscription\.denied/);
  });

  it('adds audit placeholders for chat, notification, and realtime actions', () => {
    const chatService = readApi('src/modules/chat/chat.service.ts');
    const notificationsService = readApi('src/modules/notifications/notifications.service.ts');
    const realtimeGateway = readApi('src/modules/realtime/realtime-gateway.placeholder.ts');

    assert.match(chatService, /chat\.channel\.created/);
    assert.match(chatService, /chat\.message\.created/);
    assert.match(notificationsService, /notification\.created/);
    assert.match(notificationsService, /notification\.read/);
    assert.match(realtimeGateway, /realtime\.subscription\.denied/);
  });

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
