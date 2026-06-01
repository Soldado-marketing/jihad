import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readApi = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');
const existsApi = (relativePath) => existsSync(join(apiRoot, relativePath));

describe('Sprint 8 voice notes and voice-to-task API baseline', () => {
  it('adds voice note, transcript, and voice-to-task draft models with tenant scope', () => {
    const schema = readApi('prisma/schema.prisma');
    const models = ['VoiceNote', 'VoiceTranscript', 'VoiceToTaskDraft'];
    const enums = ['VoiceNoteStatus', 'TranscriptStatus', 'VoiceToTaskDraftStatus'];

    for (const model of models) {
      assert.match(schema, new RegExp(`model ${model} \\{`));
      const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
      assert.match(block, /tenantId\s+String/);
      assert.match(block, /@@index\(\[tenantId/);
    }

    for (const prismaEnum of enums) {
      assert.match(schema, new RegExp(`enum ${prismaEnum} \\{`));
    }

    assert.match(schema, /TRANSCRIPTION_REQUESTED/);
    assert.match(schema, /LOW_CONFIDENCE/);
    assert.match(schema, /NEEDS_REVIEW/);
    assert.match(schema, /CONFIRMED/);
  });

  it('adds voice, transcription, AI placeholder, and voice-to-task modules', () => {
    const requiredFiles = [
      'src/modules/voice-notes/voice-notes.controller.ts',
      'src/modules/voice-notes/voice-notes.service.ts',
      'src/modules/voice-notes/voice-notes.repository.ts',
      'src/modules/voice-notes/voice-notes.module.ts',
      'src/modules/transcription/transcription-provider.placeholder.ts',
      'src/modules/transcription/transcription.module.ts',
      'src/modules/ai-provider/ai-extraction.placeholder.ts',
      'src/modules/ai-provider/ai-provider.module.ts',
      'src/modules/voice-to-task/voice-to-task.controller.ts',
      'src/modules/voice-to-task/voice-to-task.service.ts',
      'src/modules/voice-to-task/voice-to-task.repository.ts',
      'src/modules/voice-to-task/voice-to-task.module.ts',
    ];

    for (const file of requiredFiles) {
      assert.equal(existsApi(file), true, `${file} should exist`);
    }

    const appModule = readApi('src/app.module.ts');
    assert.match(appModule, /VoiceNotesModule/);
    assert.match(appModule, /VoiceToTaskModule/);
    assert.match(appModule, /TranscriptionModule/);
    assert.match(appModule, /AiProviderModule/);
  });

  it('adds REST-first voice note and voice-to-task endpoint skeletons', () => {
    const voiceController = readApi('src/modules/voice-notes/voice-notes.controller.ts');
    const draftController = readApi('src/modules/voice-to-task/voice-to-task.controller.ts');

    assert.match(voiceController, /@Controller\('voice-notes'\)/);
    assert.match(voiceController, /@Get\(\)/);
    assert.match(voiceController, /@Post\(\)/);
    assert.match(voiceController, /@Get\(':id'\)/);
    assert.match(voiceController, /@Patch\(':id'\)/);
    assert.match(voiceController, /@Post\(':id\/transcribe'\)/);
    assert.match(voiceController, /@Get\(':id\/transcript'\)/);
    assert.match(draftController, /@Post\('voice-notes\/:id\/task-draft'\)/);
    assert.match(draftController, /@Get\('voice-to-task-drafts'\)/);
    assert.match(draftController, /@Post\('voice-to-task-drafts\/:id\/confirm'\)/);
  });

  it('uses permission guard and Sprint 8 permission resources on protected routes', () => {
    const controllers = [
      readApi('src/modules/voice-notes/voice-notes.controller.ts'),
      readApi('src/modules/voice-to-task/voice-to-task.controller.ts'),
    ].join('\n');
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    assert.match(controllers, /@UseGuards\(PermissionGuard\)/);
    assert.match(controllers, /RequirePermission/);
    assert.match(permissionTypes, /VOICE_NOTE/);
    assert.match(permissionTypes, /VOICE_TRANSCRIPT/);
    assert.match(permissionTypes, /VOICE_TO_TASK_DRAFT/);
    assert.match(permissionTypes, /AI_PLACEHOLDER/);
  });

  it('keeps voice repositories tenant-aware and avoids direct unscoped access', () => {
    const repositories = [
      readApi('src/modules/voice-notes/voice-notes.repository.ts'),
      readApi('src/modules/voice-to-task/voice-to-task.repository.ts'),
    ].join('\n');

    assert.match(repositories, /extends TenantAwareRepository/);
    assert.match(repositories, /requireTenantContext/);
    assert.doesNotMatch(repositories, /prisma\./);
  });

  it('keeps transcription and AI provider calls placeholder-only', () => {
    const transcriptionProvider = readApi('src/modules/transcription/transcription-provider.placeholder.ts');
    const aiPlaceholder = readApi('src/modules/ai-provider/ai-extraction.placeholder.ts');

    assert.match(transcriptionProvider, /externalProviderCalled: false/);
    assert.match(transcriptionProvider, /unauthorizedTrainingAllowed: false/);
    assert.match(transcriptionProvider, /supportedLanguages: \['ar', 'en', 'de', 'mixed'\]/);
    assert.match(transcriptionProvider, /retentionReviewRequired: true/);
    assert.match(aiPlaceholder, /externalProviderCalled: false/);
    assert.match(aiPlaceholder, /humanConfirmationRequired: true/);
    assert.match(aiPlaceholder, /taskCreatedAutomatically: false/);
  });

  it('requires human confirmation and does not automatically create tasks', () => {
    const draftRepository = readApi('src/modules/voice-to-task/voice-to-task.repository.ts');
    const draftService = readApi('src/modules/voice-to-task/voice-to-task.service.ts');

    assert.match(draftRepository, /humanConfirmationRequired: true/);
    assert.match(draftRepository, /taskCreatedAutomatically: false/);
    assert.match(draftService, /taskCreated: false/);
    assert.match(draftService, /placeholder-only-no-automatic-task/);
    assert.doesNotMatch(draftService, /tasksService\.create/i);
  });

  it('adds Sprint 8 audit placeholders and preserves client boundary', () => {
    const voiceService = readApi('src/modules/voice-notes/voice-notes.service.ts');
    const draftService = readApi('src/modules/voice-to-task/voice-to-task.service.ts');
    const clientController = readApi('src/modules/client-portal/client-portal.controller.ts');

    assert.match(voiceService, /voice_note\.created/);
    assert.match(voiceService, /voice_note\.updated/);
    assert.match(voiceService, /voice_note\.transcription_requested/);
    assert.match(voiceService, /voice_transcript\.created/);
    assert.match(draftService, /voice_to_task_draft\.created/);
    assert.match(draftService, /voice_to_task_draft\.confirmed/);
    assert.match(draftService, /ai\.extraction\.placeholder_used/);
    assert.doesNotMatch(clientController, /voice/i);
    assert.doesNotMatch(clientController, /transcript/i);
  });

  it('keeps post-Sprint-8 deferred modules absent from apps/api modules', () => {
    const appModule = readApi('src/app.module.ts');

    assert.match(appModule, /VoiceNotesModule/);
    assert.match(appModule, /VoiceToTaskModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
    assert.doesNotMatch(appModule, /AdvancedAiAnalystModule/);
  });
});
