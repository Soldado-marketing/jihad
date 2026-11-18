/**
 * G07 — mentions in task comments: the string work behind the comment box.
 * Run: node --test test/mentions.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { bodyParts, insertMention, matchingMembers, mentionQuery, mentionsIn, plainBody, withMentionTokens } from '../src/lib/mentions.ts';
import { notificationHref } from '../src/lib/notifications.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ana = { id: 'u_ana', displayName: 'Ana' };
const anaMaria = { id: 'u_anamaria', displayName: 'Ana Maria' };
const anabel = { id: 'u_anabel', displayName: 'Anabel' };
const omar = { id: 'u-omar_1', displayName: 'Omar Haddad' };
const token = (m) => `@[${m.displayName}](user:${m.id})`;

describe('G07 — reading a stored comment', () => {
  it('splits text and mentions in order and keeps every character', () => {
    const body = `Please check, ${token(omar)}. Then ${token(ana)}!`;
    assert.deepEqual(bodyParts(body), [
      { text: 'Please check, ' },
      { text: '@Omar Haddad', mention: omar },
      { text: '. Then ' },
      { text: '@Ana', mention: ana },
      { text: '!' },
    ]);
    assert.equal(plainBody(body), 'Please check, @Omar Haddad. Then @Ana!');
  });

  it('leaves text without tokens, e-mail addresses and broken tokens as they are', () => {
    for (const body of ['No mention here.', 'Write to team@example.test', '@[Nobody](user:)', '@[Open(user:x)', '@Ana without a token']) {
      assert.deepEqual(bodyParts(body), [{ text: body }], body);
    }
    assert.deepEqual(bodyParts(''), []);
  });

  it('never turns comment text into markup: parts are plain strings', () => {
    const body = `<img src=x onerror=alert(1)> ${token(ana)} <b>bold</b>`;
    const parts = bodyParts(body);
    assert.equal(parts[0].text, '<img src=x onerror=alert(1)> ');
    assert.ok(parts.every((p) => typeof p.text === 'string'));
    const source = readFileSync(join(root, 'src/components/tasks/task-comments.tsx'), 'utf8');
    assert.ok(!source.includes('dangerouslySetInnerHTML'), 'the thread renders text, never HTML');
  });

  it('lists the people of a comment once each', () => {
    assert.deepEqual(mentionsIn(`${token(ana)} and ${token(omar)} and again ${token(ana)}`), [ana, omar]);
    assert.deepEqual(mentionsIn('nobody'), []);
  });
});

describe('G07 — typing a mention', () => {
  it('finds the name being typed after an @ at the caret', () => {
    assert.deepEqual(mentionQuery('Hello @om', 9), { start: 6, query: 'om' });
    assert.deepEqual(mentionQuery('@', 1), { start: 0, query: '' });
    assert.deepEqual(mentionQuery('Line one\n@Ana M', 15), { start: 9, query: 'Ana M' });
    assert.deepEqual(mentionQuery('(@an', 4), { start: 1, query: 'an' });
  });

  it('is not open in an e-mail address, after the name was finished, or across a line break', () => {
    assert.equal(mentionQuery('mail team@example', 17), null);
    assert.equal(mentionQuery('Hello @Omar Haddad ', 19), null);
    assert.equal(mentionQuery('Hello @Omar\nnext', 16), null);
    assert.equal(mentionQuery('no at sign', 5), null);
    assert.equal(mentionQuery('Hello @om and more', 6), null, 'the caret is before the @');
  });

  it('offers members whose name contains what was typed, names that start with it first', () => {
    const members = [omar, anabel, anaMaria, ana, { id: 'u_r', displayName: 'Rana' }];
    assert.deepEqual(matchingMembers(members, 'an').map((m) => m.displayName), ['Ana', 'Ana Maria', 'Anabel', 'Rana']);
    assert.deepEqual(matchingMembers(members, '').length, 5);
    assert.deepEqual(matchingMembers(members, 'zz'), []);
    assert.equal(matchingMembers(members, '', 2).length, 2);
  });

  it('puts the chosen name in place of what was typed and moves the caret behind it', () => {
    const typed = 'Hello @om, see this';
    const done = insertMention(typed, 9, omar);
    assert.equal(done.text, 'Hello @Omar Haddad , see this');
    assert.equal(done.caret, 'Hello @Omar Haddad '.length);
    assert.equal(mentionQuery(done.text, done.caret), null, 'the picker closes after a choice');
  });
});

describe('G07 — sending a comment', () => {
  it('turns the names of picked members into tokens', () => {
    assert.equal(withMentionTokens('Hello @Omar Haddad, and @Ana.', [omar, ana]), `Hello ${token(omar)}, and ${token(ana)}.`);
  });

  it('does not take a longer name for a shorter one', () => {
    assert.equal(withMentionTokens('@Ana Maria and @Ana and @Anabel', [ana, anaMaria, anabel]), `${token(anaMaria)} and ${token(ana)} and ${token(anabel)}`);
    assert.equal(withMentionTokens('@Anabel only', [ana]), '@Anabel only');
  });

  it('mentions nobody who was picked and then deleted from the text, and nobody who was only typed', () => {
    assert.equal(withMentionTokens('Just text now.', [omar]), 'Just text now.');
    assert.equal(withMentionTokens('Typed @Omar Haddad by hand', []), 'Typed @Omar Haddad by hand');
  });

  it('a comment read back and sent again mentions the same people', () => {
    const stored = `Ask ${token(anaMaria)} and ${token(omar)}.`;
    assert.equal(withMentionTokens(plainBody(stored), mentionsIn(stored)), stored);
  });
});

describe('G07 — the notice leads to the task', () => {
  it('a task notice opens that task in the workspace and leads nowhere in the client portal', () => {
    assert.equal(notificationHref('task', 'task 1/x', 'workspace'), '/tasks?open=task%201%2Fx');
    assert.equal(notificationHref('task', null, 'workspace'), '/tasks');
    assert.equal(notificationHref('task', 'task1', 'client'), null);
    assert.equal(notificationHref('appointment', 'a1', 'workspace'), '/tasks', 'appointments are unchanged');
  });
});
