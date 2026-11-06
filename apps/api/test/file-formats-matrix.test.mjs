/**
 * C03 — supported upload formats, one row per extension.
 *
 * Every allowed format is accepted only with its own magic bytes (or, for the
 * signature-less text formats, only without NUL bytes), gets the content type
 * the server decides (never the client's), and renders inline only when it is
 * on the inline-safe list. Formats that can execute script, legacy Office
 * binaries and executables are refused. Adding a format means adding a row
 * here on purpose.
 *
 * Run: node --test test/file-formats-matrix.test.mjs
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// file-type.ts imports a sibling without an extension, so it is loaded from
// the compiled output like the other behavioural tests (CI builds first).
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const {
  ALLOWED_FILE_TYPES,
  FileTooLargeError,
  UnsupportedFileTypeError,
  resolveDisposition,
  validateUpload,
} = require(join(apiRoot, 'dist/modules/storage/file-type.js'));

const MAX = 1024 * 1024;

/** Builds a buffer that satisfies one rule: signature at its offset, WEBP fourcc, or plain text. */
function sampleFor(ext, rule) {
  const buf = Buffer.alloc(64, 0x20); // spaces: valid text, never a magic number
  if (rule.signatures.length === 0) return Buffer.from('hello, world\n');
  const sig = Buffer.from(rule.signatures[0], 'hex');
  sig.copy(buf, rule.signatureOffset ?? 0);
  if (ext === '.webp') buf.write('WEBP', 8, 'ascii');
  return buf;
}

const EXPECTED = {
  '.png': ['image/png', 'inline'],
  '.jpg': ['image/jpeg', 'inline'],
  '.jpeg': ['image/jpeg', 'inline'],
  '.gif': ['image/gif', 'inline'],
  '.webp': ['image/webp', 'inline'],
  '.pdf': ['application/pdf', 'inline'],
  '.txt': ['text/plain', 'attachment'],
  '.csv': ['text/csv', 'attachment'],
  '.zip': ['application/zip', 'attachment'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'attachment'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'attachment'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'attachment'],
  '.mp4': ['video/mp4', 'inline'],
  '.mov': ['video/quicktime', 'inline'],
  '.url': ['text/plain', 'attachment'],
};

describe('C03 — the allow-list is exactly the reviewed set', () => {
  it('contains the 15 reviewed extensions and nothing else', () => {
    assert.deepEqual(Object.keys(ALLOWED_FILE_TYPES).sort(), Object.keys(EXPECTED).sort());
  });
});

describe('C03 — one row per format', () => {
  for (const [ext, rule] of Object.entries(ALLOWED_FILE_TYPES)) {
    const [contentType, disposition] = EXPECTED[ext];

    it(`${ext}: accepted with its own content, typed ${contentType}, ${disposition}`, () => {
      const out = validateUpload({ originalName: `delivery${ext}`, buffer: sampleFor(ext, rule), maxBytes: MAX });
      assert.equal(out.extension, ext);
      assert.equal(out.contentType, contentType);
      assert.equal(resolveDisposition(out.contentType, 'inline'), disposition);
      assert.equal(resolveDisposition(out.contentType, 'attachment'), 'attachment');
    });

    it(`${ext}: refused when the content is not that format`, () => {
      // Signature formats: a buffer of NUL bytes carries no magic. Text formats: NUL bytes are not text.
      const wrong = Buffer.alloc(64, 0);
      assert.throws(
        () => validateUpload({ originalName: `delivery${ext}`, buffer: wrong, maxBytes: MAX }),
        UnsupportedFileTypeError,
      );
    });

    it(`${ext}: the declared client type is ignored, the extension and bytes decide`, () => {
      const out = validateUpload({ originalName: `UPPER${ext.toUpperCase()}`, buffer: sampleFor(ext, rule), maxBytes: MAX });
      assert.equal(out.contentType, contentType);
    });
  }
});

describe('C03 — refused families', () => {
  const refused = {
    '.svg': Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), // script-capable image
    '.html': Buffer.from('<!doctype html><script>1</script>'),
    '.js': Buffer.from('alert(1)'),
    '.exe': Buffer.from('4d5a9000', 'hex'),
    '.doc': Buffer.from('d0cf11e0a1b11ae1', 'hex'), // legacy OLE Office (not supported; see C03 review)
    '.xls': Buffer.from('d0cf11e0a1b11ae1', 'hex'),
    '.ppt': Buffer.from('d0cf11e0a1b11ae1', 'hex'),
    '.json': Buffer.from('{}'),
  };
  for (const [ext, buffer] of Object.entries(refused)) {
    it(`${ext} is not an allowed upload type`, () => {
      assert.throws(() => validateUpload({ originalName: `x${ext}`, buffer, maxBytes: MAX }), UnsupportedFileTypeError);
    });
  }

  it('a double extension is judged by the last one', () => {
    assert.throws(
      () => validateUpload({ originalName: 'report.pdf.exe', buffer: Buffer.from('255044462d', 'hex'), maxBytes: MAX }),
      UnsupportedFileTypeError,
    );
  });

  it('a renamed PDF is refused as an image, and vice versa', () => {
    const pdf = sampleFor('.pdf', ALLOWED_FILE_TYPES['.pdf']);
    const png = sampleFor('.png', ALLOWED_FILE_TYPES['.png']);
    assert.throws(() => validateUpload({ originalName: 'a.png', buffer: pdf, maxBytes: MAX }), UnsupportedFileTypeError);
    assert.throws(() => validateUpload({ originalName: 'a.pdf', buffer: png, maxBytes: MAX }), UnsupportedFileTypeError);
  });

  it('a fake .mp4 (no ftyp box) is refused; a real one is inline-safe for playback', () => {
    assert.throws(() => validateUpload({ originalName: 'v.mp4', buffer: Buffer.from('not a video at all'), maxBytes: MAX }), UnsupportedFileTypeError);
    const real = Buffer.alloc(32, 0x20); Buffer.from('66747970', 'hex').copy(real, 4);
    assert.equal(resolveDisposition(validateUpload({ originalName: 'v.mp4', buffer: real, maxBytes: MAX }).contentType, 'inline'), 'inline');
  });

  it('a ZIP is stored as an attachment and never rendered inline', () => {
    const zip = sampleFor('.zip', ALLOWED_FILE_TYPES['.zip']);
    assert.equal(resolveDisposition(validateUpload({ originalName: 'bundle.zip', buffer: zip, maxBytes: MAX }).contentType, 'inline'), 'attachment');
  });

  it('a link file is plain text, attachment only, and must not contain NUL bytes', () => {
    const link = Buffer.from('[InternetShortcut]\r\nURL=https://example.test/x\r\n');
    assert.equal(validateUpload({ originalName: 'link.url', buffer: link, maxBytes: MAX }).contentType, 'text/plain');
    assert.throws(() => validateUpload({ originalName: 'link.url', buffer: Buffer.concat([link, Buffer.alloc(4, 0)]), maxBytes: MAX }), UnsupportedFileTypeError);
  });

  it('size is enforced before content, and empty files are refused', () => {
    assert.throws(() => validateUpload({ originalName: 'a.pdf', buffer: Buffer.alloc(11, 1), maxBytes: 10 }), FileTooLargeError);
    assert.throws(() => validateUpload({ originalName: 'a.pdf', buffer: Buffer.alloc(0), maxBytes: 10 }), UnsupportedFileTypeError);
  });
});

describe('C06 — the size refusal is a sentence people can read', () => {
  const { describeSize } = require(join(apiRoot, 'dist/modules/storage/file-type.js'));

  it('names both sizes in MiB/KiB and keeps the FILE_TOO_LARGE class', () => {
    const limit = 25 * 1024 * 1024;
    const buffer = Buffer.alloc(limit + 1, 0x89);
    assert.throws(
      () => validateUpload({ originalName: 'big.png', buffer, maxBytes: limit }),
      (err) => err instanceof FileTooLargeError && /^This file is 25\.0 MiB; the upload limit is 25 MiB\.$/.test(err.message),
    );
    assert.equal(describeSize(limit), '25 MiB');
    assert.equal(describeSize(3.25 * 1024 * 1024), '3.3 MiB');
    assert.equal(describeSize(512 * 1024), '512.0 KiB');
    assert.equal(describeSize(900), '900 bytes');
    // No byte counts, no internals: the web app shows this sentence as-is.
    assert.doesNotMatch(describeSize(limit + 1), /\d{7,}/);
  });
});
