/**
 * Side-by-side version comparison (plan row D04): staff compare two versions of
 * one file on the file page; images and PDFs render next to each other, other
 * types are compared by their details. The bytes come through the same
 * permission-checked content route as a preview. Clients never see the
 * version history, so the client portal does not get this panel.
 * Run: node --test test/file-version-compare.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  comparableVersions,
  defaultComparePair,
  formatBytes,
  formatSizeDelta,
  previewKind,
} from '../src/lib/file-compare.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const versions = [
  { id: 'v1', versionNumber: 1, status: 'SUPERSEDED', originalName: 'logo.png', sizeBytes: 10_240 },
  { id: 'v2', versionNumber: 2, status: 'QUARANTINED', originalName: 'logo.png', sizeBytes: 999 },
  { id: 'v3', versionNumber: 3, status: 'ACTIVE', originalName: 'logo.png', sizeBytes: 22_528 },
  { id: 'v0', versionNumber: 0, status: 'BLOCKED', originalName: 'logo.png', sizeBytes: 1 },
];

describe('file version comparison helpers', () => {
  it('compares only versions that can be opened, newest first', () => {
    assert.deepEqual(comparableVersions(versions).map((v) => v.id), ['v3', 'v1']);
  });

  it('opens on the newest two versions and on nothing when there is only one', () => {
    assert.deepEqual(defaultComparePair(versions), { olderId: 'v1', newerId: 'v3' });
    assert.equal(defaultComparePair(versions.slice(2)), null);
    assert.equal(defaultComparePair([]), null);
  });

  it('renders images and PDFs in the page and everything else by its details', () => {
    assert.equal(previewKind('Brief.PDF'), 'pdf');
    assert.equal(previewKind('photo.JPEG'), 'image');
    assert.equal(previewKind('cover.webp'), 'image');
    assert.equal(previewKind('clip.mp4'), 'metadata');
    assert.equal(previewKind('deck.pptx'), 'metadata');
    assert.equal(previewKind(null), 'metadata');
  });

  it('describes the size difference in plain words', () => {
    assert.equal(formatSizeDelta(10_240, 22_528), '12.0 KB larger');
    assert.equal(formatSizeDelta(22_528, 10_240), '12.0 KB smaller');
    assert.equal(formatSizeDelta(500, 500), 'Same size');
    assert.equal(formatSizeDelta(null, 500), '');
    assert.equal(formatBytes(undefined), 'Unknown size');
    assert.equal(formatBytes(3 * 1024 * 1024), '3.0 MB');
  });
});

describe('file version comparison panel', () => {
  const panel = read('src/components/files/file-version-compare.tsx');
  const detail = read('src/components/files/file-detail.tsx');

  it('is part of the file page, after the upload and before the version list', () => {
    assert.match(detail, /import \{ FileVersionCompare \} from '\.\/file-version-compare'/);
    const compareAt = detail.indexOf('<FileVersionCompare versions={versions} fileAssetId={id} />');
    const listAt = detail.indexOf('<FileVersionList versions={versions} fileAssetId={id} />');
    const uploadAt = detail.indexOf('<FileUploader fileAssetId={id}');
    assert.ok(compareAt > uploadAt && compareAt < listAt, 'compare sits between upload and the version list');
  });

  it('reads bytes only through the permission-checked content route, never a storage key or signed URL', () => {
    assert.match(panel, /apiBlob\(\s*`\/files\/\$\{fileAssetId\}\/versions\/\$\{version\.id\}\/content\?disposition=inline`/);
    assert.doesNotMatch(panel, /storageKey|presign|signedUrl|S3_|bucket/i);
    assert.match(panel, /URL\.createObjectURL\(blob\)/);
    assert.match(panel, /URL\.revokeObjectURL\(url\)/);
  });

  it('shows two labelled pickers side by side on a desktop and stacked on a phone', () => {
    assert.match(panel, /className="mt-4 grid gap-4 md:grid-cols-2"/);
    assert.match(panel, /<select[\s\S]*?id=\{selectId\}/);
    assert.match(panel, /aria-label=\{`\$\{label\} version`\}/);
    assert.match(panel, /label="Left"/);
    assert.match(panel, /label="Right"/);
    assert.match(panel, /Swap sides/);
  });

  it('renders images and PDFs in the page and falls back to details for other types', () => {
    assert.match(panel, /kind === 'image' && \(preview[\s\S]*?<img src=\{preview\.url\}[^>]*object-contain/);
    assert.match(panel, /kind === 'pdf' && \(preview[\s\S]*?<iframe src=\{preview\.url\}/);
    assert.match(panel, /kind === 'metadata' && \([\s\S]*?compared instead/);
    assert.match(panel, /<dl className="mt-3 grid grid-cols-\[auto_1fr\]/);
    assert.match(panel, /Upload a second version to see the two side by side/);
  });

  it('keeps the width of long file names and touch targets honest', () => {
    assert.match(panel, /<article className="min-w-0/);
    assert.match(panel, /min-w-0 break-words/);
    assert.match(panel, /min-h-11/);
  });

  it('stays out of the client portal, which shows only the delivered version', () => {
    const clientFiles = [
      'app/(client)/client/deliveries/[id]/page.tsx',
      'app/(client)/client/files/page.tsx',
      'src/components/files/client-file-record-panel.tsx',
      'src/components/files/client-delivery-panel.tsx',
    ].map(read).join('\n');
    assert.doesNotMatch(clientFiles, /file-version-compare|FileVersionCompare/);
    assert.doesNotMatch(panel, /\/client\//);
  });
});
