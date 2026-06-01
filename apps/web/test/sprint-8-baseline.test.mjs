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

describe('Sprint 8 voice notes and voice-to-task frontend baseline', () => {
  it('adds voice note and voice-to-task draft workspace pages', () => {
    const routes = [
      'app/(workspace)/voice/page.tsx',
      'app/(workspace)/voice/[id]/page.tsx',
      'app/(workspace)/voice/task-drafts/page.tsx',
      'app/(workspace)/voice/task-drafts/[id]/page.tsx',
    ];

    for (const route of routes) {
      assert.equal(existsWeb(route), true, `${route} should exist`);
    }
  });

  it('adds required voice, transcript, AI placeholder, and confirmation components', () => {
    const components = [
      'src/components/voice/voice-note-list.tsx',
      'src/components/voice/voice-note-detail.tsx',
      'src/components/voice/voice-recorder-placeholder.tsx',
      'src/components/voice/transcript-panel.tsx',
      'src/components/voice/voice-to-task-draft-list.tsx',
      'src/components/voice/voice-to-task-draft-detail.tsx',
      'src/components/voice/human-confirmation-notice.tsx',
      'src/components/voice/ai-placeholder-notice.tsx',
      'src/components/voice/transcription-status-badge.tsx',
    ];

    for (const component of components) {
      assert.equal(existsWeb(component), true, `${component} should exist`);
    }
  });

  it('adds internal navigation for voice notes without exposing it to clients', () => {
    const workspaceNavigation = readWeb('src/navigation/navigation.ts');
    const clientNavigation = readWeb('src/navigation/client-navigation.ts');

    assert.match(workspaceNavigation, /id: 'voice'/);
    assert.match(workspaceNavigation, /href: '\/voice'/);
    assert.match(workspaceNavigation, /allowedRoles: \['OWNER', 'MANAGER', 'EMPLOYEE'\]/);
    assert.doesNotMatch(clientNavigation, /href: '\/client\/voice'/);
    assert.doesNotMatch(clientNavigation, /id: 'client-voice'/);
    assert.doesNotMatch(clientNavigation, /transcript/i);
  });

  it('keeps voice notes out of client portal source', () => {
    const clientFiles = listFiles('app/(client)')
      .concat(listFiles('src/components/client-portal'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.doesNotMatch(clientFiles, /\/voice/);
    assert.doesNotMatch(clientFiles, /VoiceNoteList/);
    assert.doesNotMatch(clientFiles, /VoiceToTaskDraft/);
  });

  it('keeps Sprint 8 safety messaging and avoids deferred feature implementation', () => {
    const sprint8Files = listFiles('app/(workspace)/voice')
      .concat(listFiles('src/components/voice'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.match(sprint8Files, /Human confirmation required/);
    assert.match(sprint8Files, /External provider calls are not active/);
    assert.match(sprint8Files, /cannot create tasks without human confirmation/);
    assert.doesNotMatch(sprint8Files, /finance/i);
    assert.doesNotMatch(sprint8Files, /report/i);
    assert.doesNotMatch(sprint8Files, /automation/i);
    assert.doesNotMatch(sprint8Files, /mobile recording/i);
  });
});
