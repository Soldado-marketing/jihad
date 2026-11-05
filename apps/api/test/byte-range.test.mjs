/**
 * C05 - byte ranges and the streaming client copy of a video.
 * Run: node --test test/byte-range.test.mjs
 *
 * Behavioural tests against the real source (Node strips the types):
 *  - parseByteRange resolves every Range form the content routes accept,
 *    ignores what the API may ignore and marks what is unsatisfiable;
 *  - Mp4ClientCopyStream produces exactly the bytes of the buffered
 *    neutraliseMp4 (through prepareForClient) for the same input, however the
 *    input is chunked, including 64-bit boxes, size-0 boxes, nesting past the
 *    depth limit, an XMP uuid box and trailing bytes; windows slice that output.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { describe, it } from 'node:test';
import { contentRangeHeader, parseByteRange, parseStoredContentRange, unsatisfiableRangeHeader } from '../src/modules/storage/byte-range.ts';
import { Mp4StructureError, mp4ClientCopyStream, prepareForClient } from '../src/modules/file-versions/client-file-privacy.ts';

describe('C05 - Range header parsing', () => {
  const N = 1000;
  it('resolves the single-range forms', () => {
    assert.deepEqual(parseByteRange('bytes=0-1', N), { kind: 'range', start: 0, end: 1 });
    assert.deepEqual(parseByteRange('bytes=10-19', N), { kind: 'range', start: 10, end: 19 });
    assert.deepEqual(parseByteRange('bytes=900-', N), { kind: 'range', start: 900, end: 999 });
    assert.deepEqual(parseByteRange('bytes=-100', N), { kind: 'range', start: 900, end: 999 });
    assert.deepEqual(parseByteRange('bytes=0-', N), { kind: 'range', start: 0, end: 999 });
    assert.deepEqual(parseByteRange(' bytes=5-5 ', N), { kind: 'range', start: 5, end: 5 });
  });
  it('clamps an end past the file and a suffix longer than the file', () => {
    assert.deepEqual(parseByteRange('bytes=990-5000', N), { kind: 'range', start: 990, end: 999 });
    assert.deepEqual(parseByteRange('bytes=-5000', N), { kind: 'range', start: 0, end: 999 });
  });
  it('marks ranges outside the file as unsatisfiable', () => {
    assert.deepEqual(parseByteRange('bytes=1000-', N), { kind: 'unsatisfiable' });
    assert.deepEqual(parseByteRange('bytes=1000-1001', N), { kind: 'unsatisfiable' });
    assert.deepEqual(parseByteRange('bytes=-0', N), { kind: 'unsatisfiable' });
    assert.deepEqual(parseByteRange('bytes=0-0', 0), { kind: 'unsatisfiable' });
    assert.deepEqual(parseByteRange('bytes=-5', 0), { kind: 'unsatisfiable' });
  });
  it('ignores what the API may ignore: no header, several ranges, other units, malformed syntax', () => {
    for (const header of [undefined, null, '', 'bytes=', 'bytes=0-1,5-6', 'items=0-1', 'bytes=abc', 'bytes=5-2', 'bytes=1-2-3', 'bytes= 0-1', 'bytes=99999999999999999999-']) {
      assert.deepEqual(parseByteRange(header, N), { kind: 'full' }, String(header));
    }
    assert.deepEqual(parseByteRange('bytes=0-1', -1), { kind: 'full' });
  });
  it('formats Content-Range for 206 and 416, and reads what storage returns', () => {
    assert.equal(contentRangeHeader(0, 1, 500), 'bytes 0-1/500');
    assert.equal(unsatisfiableRangeHeader(500), 'bytes */500');
    assert.deepEqual(parseStoredContentRange('bytes 10-19/500'), { start: 10, end: 19, size: 500 });
    for (const bad of [undefined, '', 'bytes */500', 'bytes 19-10/500', 'bytes 0-500/500', 'bytes 0-1', 'items 0-1/5']) {
      assert.equal(parseStoredContentRange(bad), null, String(bad));
    }
  });
});

// ── Synthetic MP4 structures ──────────────────────────────────────────────────
const NAME = 'Erika Example';
const box = (type, ...parts) => { const body = Buffer.concat(parts); const h = Buffer.alloc(8); h.writeUInt32BE(body.length + 8, 0); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]); };
const bigBox = (type, ...parts) => { const body = Buffer.concat(parts); const h = Buffer.alloc(16); h.writeUInt32BE(1, 0); h.write(type, 4, 'latin1'); h.writeBigUInt64BE(BigInt(body.length + 16), 8); return Buffer.concat([h, body]); };
const XMP = Buffer.from('be7acfcb97a942e89c71999491e3afac', 'hex');
const udta = () => box('udta', box('\xa9ART', Buffer.from(NAME, 'latin1')));
const ftyp = () => box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2', 'latin1'));

const samples = {
  plain: () => Buffer.concat([ftyp(), box('moov', box('mvhd', Buffer.alloc(20)), box('trak', box('tkhd', Buffer.alloc(4)), udta()), udta()), box('mdat', Buffer.from('udta frames stay untouched', 'latin1'))]),
  metaAndXmp: () => Buffer.concat([ftyp(), box('moov', box('mvhd', Buffer.alloc(20)), box('meta', Buffer.from(`hdlr ${NAME}`, 'latin1'))), box('uuid', XMP, Buffer.from(`<dc:creator>${NAME}</dc:creator>`, 'latin1')), box('uuid', randomBytes(16), Buffer.from('other uuid stays', 'latin1')), box('mdat', randomBytes(3000))]),
  largeBox: () => Buffer.concat([ftyp(), bigBox('moov', box('mvhd', Buffer.alloc(20)), bigBox('udta', Buffer.from(NAME, 'latin1'))), bigBox('mdat', randomBytes(5000))]),
  sizeZeroTail: () => { const tail = Buffer.concat([Buffer.alloc(8), Buffer.from('mdat', 'latin1'), randomBytes(2000)]); tail.writeUInt32BE(0, 0); tail.write('mdat', 4, 'latin1'); return Buffer.concat([ftyp(), box('moov', box('mvhd', Buffer.alloc(20)), udta()), tail.subarray(0, 8), tail.subarray(12)]); },
  trailing: () => Buffer.concat([ftyp(), box('moov', box('mvhd', Buffer.alloc(20)), udta(), Buffer.from('xyz', 'latin1')), box('mdat', randomBytes(100)), Buffer.from('tail', 'latin1')]),
  deep: () => { let inner = udta(); for (let d = 0; d < 10; d += 1) inner = box('trak', inner); return Buffer.concat([ftyp(), box('moov', inner), box('mdat', randomBytes(64))]); },
  moovFirst: () => Buffer.concat([box('moov', box('mvhd', Buffer.alloc(20)), udta()), box('mdat', randomBytes(300))]),
  faststartLarge: () => Buffer.concat([ftyp(), box('moov', box('mvhd', Buffer.alloc(100)), udta()), box('mdat', randomBytes(300_000)), udta()]),
};

async function streamed(buffer, options = {}, chunkSizes = [buffer.length]) {
  const stream = mp4ClientCopyStream({ totalBytes: buffer.length, ...options });
  const chunks = [];
  let offset = 0; let k = 0;
  const source = Readable.from((function* feed() {
    while (offset < buffer.length) { const n = chunkSizes[k % chunkSizes.length]; k += 1; yield buffer.subarray(offset, Math.min(buffer.length, offset + n)); offset += n; }
  })(), { objectMode: false });
  source.pipe(stream);
  for await (const chunk of stream) chunks.push(chunk);
  return { out: Buffer.concat(chunks), removed: [...stream.removed].sort() };
}

describe('C05 - streaming client copy equals the buffered copy', () => {
  for (const [name, make] of Object.entries(samples)) {
    it(`${name}: same bytes for whole-file, 1-byte, 7-byte and random chunking`, async () => {
      const src = make();
      const expected = prepareForClient(src, '.mp4');
      assert.equal(expected.action, 'serve');
      const chunkings = [[src.length], [1], [7], [13, 1, 64, 3], [Math.max(1, Math.floor(src.length / 3))]];
      for (const sizes of chunkings) {
        const { out, removed } = await streamed(src, {}, sizes);
        assert.ok(out.equals(expected.buffer), `${name} chunks=${sizes.join(',')}`);
        assert.deepEqual(removed, [...expected.removed].sort());
      }
    });
  }

  it('a window yields exactly that slice of the full copy and ends early', async () => {
    const src = samples.faststartLarge();
    const full = prepareForClient(src, '.mp4').buffer;
    for (const [start, end] of [[0, 1], [0, 0], [50, 90], [100, 100_000], [src.length - 10, src.length - 1], [src.length - 64, src.length + 500]]) {
      const stream = mp4ClientCopyStream({ totalBytes: src.length, window: { start, end } });
      let satisfied = false; stream.once('satisfied', () => { satisfied = true; });
      const chunks = [];
      Readable.from([src.subarray(0, 100), src.subarray(100)], { objectMode: false }).pipe(stream);
      for await (const chunk of stream) chunks.push(chunk);
      const out = Buffer.concat(chunks);
      assert.ok(out.equals(full.subarray(start, end + 1)), `window ${start}-${end}`);
      assert.equal(satisfied, end < src.length, `satisfied ${start}-${end}`);
    }
  });

  it('emit: false validates without producing bytes; a broken box is reported as a structure error', async () => {
    const src = samples.plain();
    const check = mp4ClientCopyStream({ totalBytes: src.length, emit: false });
    const chunks = [];
    Readable.from([src], { objectMode: false }).pipe(check);
    for await (const chunk of check) chunks.push(chunk);
    assert.equal(chunks.length, 0);
    assert.deepEqual([...check.removed], ['udta']);

    const broken = samples.plain(); broken.writeUInt32BE(0xffffff, broken.indexOf('mvhd', 0, 'latin1') - 4);
    await assert.rejects(streamed(broken), (error) => error instanceof Mp4StructureError && /overruns/.test(error.message));
    await assert.rejects(streamed(Buffer.from('not a video at all, really not')), (error) => error instanceof Mp4StructureError && /Not a valid/.test(error.message));
    assert.equal(prepareForClient(broken, '.mp4').action, 'block', 'the buffered walk agrees');
  });
});
