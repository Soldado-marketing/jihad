/**
 * Every theme colour a page uses must exist in tailwind.config.ts: an unknown
 * name silently produces no CSS (the sign-in button once rendered as text).
 * Run: node --test test/theme-tokens.test.mjs
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const config = readFileSync(join(webRoot, 'tailwind.config.ts'), 'utf8');
const defined = new Set([...config.matchAll(/^\s+'?([a-z-]+)'?: '#[0-9a-f]{6}',/gm)].map((m) => m[1]));

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

// The custom names this codebase uses; Tailwind's own palette (slate-100 etc.) is not checked.
const CUSTOM = ['primary', 'primary-foreground', 'destructive', 'surface', 'foreground', 'background', 'border', 'accent', 'ink', 'panel', 'line', 'muted', 'canvas', 'danger', 'soft', 'brand'];

describe('theme tokens', () => {
  it('every custom colour used in classes is defined', () => {
    const used = new Set();
    for (const f of [...files(join(webRoot, 'app')), ...files(join(webRoot, 'src'))]) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\b(?:bg|text|border|ring|divide|placeholder:text|from|to)-([a-z]+(?:-foreground)?)(?:\/\d+)?\b/g)) {
        if (CUSTOM.includes(m[1])) used.add(m[1]);
      }
    }
    assert.ok(used.has('primary'), 'scan found the auth pages');
    assert.deepEqual([...used].filter((name) => !defined.has(name)), []);
  });
});
