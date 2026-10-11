import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertGuardedController, assertTenantScopedRepository } from './support/source-assertions.mjs';

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

  // The unused transcription and AI-extraction placeholders were removed in
  // MAOS-T38; no provider integration exists.
  it('adds voice and voice-to-task modules', () => {
    const requiredFiles = [
      'src/modules/voice-notes/voice-notes.controller.ts',
      'src/modules/voice-notes/voice-notes.service.ts',
      'src/modules/voice-notes/voice-notes.repository.ts',
      'src/modules/voice-notes/voice-notes.module.ts',
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
    assert.doesNotMatch(appModule, /TranscriptionModule|AiProviderModule/);
  });

  it('adds REST-first voice note and voice-to-task endpoint skeletons', () => {
    const voiceController = readApi('src/modules/voice-notes/voice-notes.controller.ts');
    const draftController = readApi('src/modules/voice-to-task/voice-to-task.controller.ts');

    assert.match(voiceController, /@Controller\('voice-notes'\)/);
    assert.match(voiceController, /@Get\(\)/);
    assert.match(voiceController, /@Post\(\)/);
    assert.match(voiceController, /@Get\(':id'\)/);
    assert.match(voiceController, /@Delete\(':id'\)/);
    // MAOS-T38/T39: transcription was a placeholder and was removed; no route
    // may pretend to transcribe until a real provider is built.
    assert.doesNotMatch(voiceController, /transcri/i);
    assert.match(draftController, /@Post\('voice-notes\/:id\/task-draft'\)/);
    assert.match(draftController, /@Get\('voice-to-task-drafts'\)/);
    assert.match(draftController, /@Post\('voice-to-task-drafts\/:id\/confirm'\)/);
  });

  it('uses permission guard and Sprint 8 permission resources on protected routes', () => {
    for (const path of [
      'src/modules/voice-notes/voice-notes.controller.ts',
      'src/modules/voice-to-task/voice-to-task.controller.ts',
    ]) {
      assertGuardedController(assert, readApi(path), path);
    }
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    assert.match(permissionTypes, /VOICE_NOTE/);
    assert.match(permissionTypes, /VOICE_TRANSCRIPT/);
    assert.match(permissionTypes, /VOICE_TO_TASK_DRAFT/);
    assert.match(permissionTypes, /AI_PLACEHOLDER/);
  });

  it('keeps voice repositories tenant-aware and avoids direct unscoped access', () => {
    // MAOS-T39: every query carries a tenantId boundary (see support helper).
    for (const path of [
      'src/modules/voice-notes/voice-notes.repository.ts',
      'src/modules/voice-to-task/voice-to-task.repository.ts',
    ]) {
      assertTenantScopedRepository(assert, readApi(path), path);
    }
  });

  // MAOS-T38 removed the transcription/AI placeholders. The safety property they
  // stood for still holds and is checked here: no provider module exists, so
  // no external transcription or AI provider can be called.
  it('makes no transcription or AI provider calls', () => {
    assert.equal(existsApi('src/modules/transcription'), false);
    assert.equal(existsApi('src/modules/ai-provider'), false);
    const appModule = readApi('src/app.module.ts');
    assert.doesNotMatch(appModule, /TranscriptionModule|AiProviderModule/);
  });

  it('requires human confirmation and does not automatically create tasks', () => {
    const draftRepository = readApi('src/modules/voice-to-task/voice-to-task.repository.ts');
    const draftService = readApi('src/modules/voice-to-task/voice-to-task.service.ts');

    // MAOS-T39: confirmation is an explicit human request on its own route,
    // and it only marks the draft CONFIRMED - no task is created by it.
    const draftController = readApi('src/modules/voice-to-task/voice-to-task.controller.ts');
    assert.match(draftController, /@Post\('voice-to-task-drafts\/:id\/confirm'\)/);
    assert.match(draftRepository, /data: \{ status: 'CONFIRMED' \}/);
    assert.doesNotMatch(`${draftService}\n${draftRepository}`, /tasksService|task\.create\(|createTask\(/i);
  });

  it('keeps voice out of the client portal', () => {
    const clientController = readApi('src/modules/client-portal/client-portal.controller.ts');
    assert.doesNotMatch(clientController, /voice/i);
    assert.doesNotMatch(clientController, /transcript/i);
  });

  it.todo('writes audit events for voice notes and voice-to-task drafts (specified in Sprint 8, never built; backlog F-4)');

  it('keeps post-Sprint-8 deferred modules absent from apps/api modules', () => {
    const appModule = readApi('src/app.module.ts');

    assert.match(appModule, /VoiceNotesModule/);
    assert.match(appModule, /VoiceToTaskModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
    assert.doesNotMatch(appModule, /AdvancedAiAnalystModule/);
  });
});
