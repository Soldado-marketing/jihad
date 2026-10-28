import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const web = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(web, path), 'utf8');

describe('Invite Only registration UI', () => {
  it('login page no longer links to open public registration', () => {
    const source = read('app/(auth)/auth/login/page.tsx');
    assert.doesNotMatch(source, /href=['"]\/auth\/register['"]/);
    assert.match(source, /invitation/i);
  });
  it('old registration URL is information-only and never submits credentials', () => {
    const source = read('app/(auth)/auth/register/page.tsx');
    assert.match(source, /Access by invitation only/);
    assert.doesNotMatch(source, /fetch\(|\/auth\/register.*POST/);
    assert.match(source, /href="\/auth\/login"/);
  });
  it('existing accounts sign in separately and accept using their JWT, without a new password', () => {
    const source = read('app/(auth)/auth/invite/page.tsx');
    assert.match(source, /auth\/invites\/accept-existing/);
    assert.match(source, /Authorization:/);
    assert.match(source, /preview\.accountExists/);
    assert.match(source, /target="_blank"/);
    assert.match(source, /Sign in to your existing account/);
    const login = read('app/(auth)/auth/login/page.tsx');
    assert.match(login, /tenantSlug/);
    assert.match(login, /new URLSearchParams/);
  });

  it('tokenized invitation acceptance stays available', () => {
    const source = read('app/(auth)/auth/invite/page.tsx');
    assert.match(source, /auth\/invites\/accept/);
    assert.match(source, /auth\/invites\/preview/);
  });
});
