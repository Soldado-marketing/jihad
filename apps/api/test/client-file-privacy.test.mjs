/**
 * Client file privacy (owner decision 2026-11-02): what a CLIENT downloads has
 * known identifying metadata removed, keeps the image or document intact, and
 * formats that cannot be checked or cleaned safely are refused.
 * Run: node --test test/client-file-privacy.test.mjs
 */
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { describe, it } from 'node:test';
import { deliveryKind, linkAddress, prepareForClient, safeClientFilename } from '../src/modules/file-versions/client-file-privacy.ts';

const NAME = 'Erika Example';
const has = (buf, text) => buf.toString('latin1').includes(text);
const seg = (marker, data) => { const h = Buffer.from([0xff, marker, 0, 0]); h.writeUInt16BE(data.length + 2, 2); return Buffer.concat([h, data]); };

function jpegTiff(orientation) {
  const t = Buffer.alloc(26);
  t.write('MM', 0, 'latin1'); t.writeUInt16BE(42, 2); t.writeUInt32BE(8, 4); t.writeUInt16BE(1, 8);
  t.writeUInt16BE(0x0112, 10); t.writeUInt16BE(3, 12); t.writeUInt32BE(1, 14); t.writeUInt16BE(orientation, 18);
  return t;
}
function jpeg({ orientation = 6, c2pa = false } = {}) {
  // EXIF with Artist (0x013B) and Orientation (0x0112), big-endian TIFF.
  const tiff = Buffer.alloc(8 + 2 + 24 + 4 + 16);
  tiff.write('MM', 0, 'latin1'); tiff.writeUInt16BE(42, 2); tiff.writeUInt32BE(8, 4); tiff.writeUInt16BE(2, 8);
  tiff.writeUInt16BE(0x0112, 10); tiff.writeUInt16BE(3, 12); tiff.writeUInt32BE(1, 14); tiff.writeUInt16BE(orientation, 18);
  tiff.writeUInt16BE(0x013b, 22); tiff.writeUInt16BE(2, 24); tiff.writeUInt32BE(14, 26); tiff.writeUInt32BE(38, 30);
  tiff.write(NAME + '\0', 38, 'latin1');
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
    seg(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff])),
    seg(0xe1, Buffer.from(`http://ns.adobe.com/xap/1.0/\0<dc:creator>${NAME}</dc:creator>`, 'latin1')),
    seg(0xed, Buffer.from(`Photoshop 3.0\0By-line ${NAME}`, 'latin1')),
    seg(0xfe, Buffer.from(`made by ${NAME}`, 'latin1')),
    ...(c2pa ? [seg(0xeb, Buffer.from('JP\0\0jumbc2pa manifest', 'latin1'))] : []),
    seg(0xe2, Buffer.from('ICC_PROFILE\0\x01\x01colour', 'latin1')),
    seg(0xdb, Buffer.from([0, 1, 2, 3])),
    seg(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
    Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56]),
    Buffer.from([0xff, 0xd9]),
  ]);
}
const pngChunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4, 7)]);
};
const png = () => Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  pngChunk('IHDR', Buffer.alloc(13, 1)), pngChunk('tEXt', Buffer.from(`Author\0${NAME}`, 'latin1')),
  pngChunk('iTXt', Buffer.from(`Creator\0\0\0\0\0${NAME}`, 'latin1')), pngChunk('IDAT', Buffer.from('pixels', 'latin1')), pngChunk('IEND', Buffer.alloc(0)),
]);
const gif = () => Buffer.concat([
  Buffer.from('GIF89a', 'latin1'), Buffer.from([1, 0, 1, 0, 0, 0, 0]),
  Buffer.from([0x21, 0xfe, `by ${NAME}`.length]), Buffer.from(`by ${NAME}`, 'latin1'), Buffer.from([0]),
  Buffer.from([0x21, 0xff, 11]), Buffer.from('XMP DataXMP', 'latin1'), Buffer.from([NAME.length]), Buffer.from(NAME, 'latin1'), Buffer.from([0]),
  Buffer.from([0x21, 0xff, 11]), Buffer.from('NETSCAPE2.0', 'latin1'), Buffer.from([3, 1, 0, 0, 0]),
  Buffer.from([0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0, 0x3b]),
]);
const riff = (type, data) => { const h = Buffer.from(type + '\0\0\0\0', 'latin1'); h.writeUInt32LE(data.length, 4); return Buffer.concat([h, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
function webp() {
  const body = Buffer.concat([riff('VP8X', Buffer.from([0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0])), riff('VP8L', Buffer.from('image!', 'latin1')), riff('EXIF', Buffer.from(`Artist ${NAME}`, 'latin1')), riff('XMP ', Buffer.from(`<dc:creator>${NAME}</dc:creator>`, 'latin1'))]);
  const h = Buffer.from('RIFF\0\0\0\0WEBP', 'latin1'); h.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([h, body]);
}
const pdf = (extra = '', info = `<< /Author (${NAME}) /Creator (${NAME} \\(Studio\\)) /Producer (PDF Tool) >>`) => Buffer.from([
  '%PDF-1.7',
  '1 0 obj << /Type /Catalog /Pages 2 0 R /Metadata 4 0 R >> endobj',
  '2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj',
  `3 0 obj ${info} endobj`,
  `4 0 obj << /Type /Metadata /Subtype /XML /Length 99 >> stream\n<x:xmpmeta><rdf:li>keep</rdf:li><dc:creator><rdf:Seq><rdf:li>${NAME}</rdf:li></rdf:Seq></dc:creator><pdf:Producer>PDF Tool</pdf:Producer></x:xmpmeta>\nendstream endobj`,
  extra,
  'xref 0 5', 'trailer << /Size 5 /Root 1 0 R /Info 3 0 R >>', 'startxref 9', '%%EOF',
].join('\n'), 'latin1');

describe('client copies keep the file intact and drop identifying metadata', () => {
  it('JPEG: EXIF, XMP, IPTC and comments go; orientation, colour profile and image data stay', () => {
    const src = jpeg();
    const r = prepareForClient(src, '.jpg');
    assert.equal(r.action, 'serve');
    assert.ok(!has(r.buffer, NAME));
    assert.deepEqual([...r.buffer.subarray(0, 2)], [0xff, 0xd8]);
    assert.deepEqual([...r.buffer.subarray(-2)], [0xff, 0xd9]);
    assert.ok(has(r.buffer, 'JFIF') && has(r.buffer, 'ICC_PROFILE'));
    assert.ok(r.buffer.toString('latin1').indexOf('JFIF') < r.buffer.toString('latin1').indexOf('Exif'), 'JFIF stays first');
    const exif = r.buffer.indexOf(Buffer.from('Exif\0\0MM', 'latin1'));
    assert.ok(exif > 0 && r.buffer.readUInt16BE(exif + 6 + 18) === 6, 'orientation 6 kept');
    assert.ok(r.buffer.includes(Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56])), 'image data byte for byte');
    assert.ok(r.removed.includes('EXIF/XMP') && r.removed.includes('IPTC') && r.removed.includes('comment'));
  });

  it('JPEG with two EXIF blocks keeps the orientation of the first', () => {
    const src = jpeg();
    const second = seg(0xe1, Buffer.from('Exif\0\0MM\0\x2a\0\0\0\x08\0\0\0\0\0\0', 'latin1'));
    const r = prepareForClient(Buffer.concat([src.subarray(0, 2), seg(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), jpegTiff(8)])), second, src.subarray(2)]), '.jpg');
    const exif = r.buffer.indexOf(Buffer.from('Exif\0\0MM', 'latin1'));
    assert.equal(r.buffer.readUInt16BE(exif + 6 + 18), 8);
  });

  it('JPEG with orientation 1 gets no EXIF at all; signed (C2PA) JPEG is refused', () => {
    assert.ok(!has(prepareForClient(jpeg({ orientation: 1 }), '.jpeg').buffer, 'Exif'));
    assert.equal(prepareForClient(jpeg({ c2pa: true }), '.jpg').action, 'block');
  });

  it('PNG: text and EXIF chunks go, image chunks stay unchanged', () => {
    const r = prepareForClient(png(), '.png');
    assert.equal(r.action, 'serve');
    assert.ok(!has(r.buffer, NAME) && !has(r.buffer, 'tEXt') && !has(r.buffer, 'iTXt'));
    assert.ok(r.buffer.includes(pngChunk('IHDR', Buffer.alloc(13, 1))) && r.buffer.includes(pngChunk('IDAT', Buffer.from('pixels', 'latin1'))));
    assert.ok(has(r.buffer.subarray(-12), 'IEND'));
  });

  it('GIF: comments and XMP go, the looping block and image stay', () => {
    const r = prepareForClient(gif(), '.gif');
    assert.equal(r.action, 'serve');
    assert.ok(!has(r.buffer, NAME) && !has(r.buffer, 'XMP DataXMP'));
    assert.ok(has(r.buffer, 'NETSCAPE2.0'));
    assert.equal(r.buffer[r.buffer.length - 1], 0x3b);
  });

  it('WebP: EXIF and XMP chunks go, flags and sizes are corrected', () => {
    const r = prepareForClient(webp(), '.webp');
    assert.equal(r.action, 'serve');
    assert.ok(!has(r.buffer, NAME));
    assert.equal(r.buffer.readUInt32LE(4), r.buffer.length - 8, 'RIFF size');
    assert.equal(r.buffer[20] & 0x0c, 0, 'EXIF/XMP flags off');
    assert.ok(has(r.buffer, 'VP8L'));
  });

  it('PDF: author fields are blanked in place, every byte offset is unchanged', () => {
    const src = pdf();
    const r = prepareForClient(src, '.pdf');
    assert.equal(r.action, 'serve');
    assert.equal(r.buffer.length, src.length);
    assert.ok(!has(r.buffer, NAME));
    for (const keep of ['/Producer (PDF Tool)', '<pdf:Producer>PDF Tool</pdf:Producer>', '<rdf:li>keep</rdf:li>', 'startxref 9']) assert.ok(has(r.buffer, keep), keep);
    for (let i = 0; i < src.length; i++) if (src[i] !== r.buffer[i]) assert.equal(r.buffer[i], 0x20, 'only spaces written');
  });

  it('PDF without author data is served byte for byte', () => {
    const src = pdf('', '<< /Producer (PDF Tool) >>').toString('latin1').replace(`<rdf:li>${NAME}</rdf:li>`, '');
    const buf = Buffer.from(src, 'latin1');
    assert.ok(prepareForClient(buf, '.pdf').buffer.equals(buf));
  });

  it('PDF that cannot be cleaned safely is refused', () => {
    const cases = {
      signed: pdf('5 0 obj << /Type /Sig /ByteRange [0 10 20 30] >> endobj'),
      encrypted: Buffer.from(pdf().toString('latin1').replace('/Root 1 0 R', '/Root 1 0 R /Encrypt 9 0 R'), 'latin1'),
      infoInObjectStream: Buffer.from(pdf().toString('latin1').replace('/Info 3 0 R', '/Info 8 0 R'), 'latin1'),
      reviewComment: pdf(`6 0 obj << /Type /Annot /Subtype /Text /T (${NAME}) /Contents (fix) >> endobj`),
      compressedAuthor: pdf(`7 0 obj << /Type /ObjStm /N 1 /First 4 /Filter /FlateDecode /Length 40 >> stream\n${deflateSync(Buffer.from(`9 0 << /Author (${NAME}) >>`)).toString('latin1')}\nendstream endobj`),
    };
    for (const [name, buf] of Object.entries(cases)) assert.equal(prepareForClient(buf, '.pdf').action, 'block', name);
  });

  it('a signed PDF without author data is served unchanged', () => {
    const src = Buffer.from(pdf('5 0 obj << /Type /Sig /ByteRange [0 10 20 30] >> endobj', '<< /Producer (PDF Tool) >>').toString('latin1').replace(`<rdf:li>${NAME}</rdf:li>`, ''), 'latin1');
    assert.ok(prepareForClient(src, '.pdf').buffer.equals(src));
  });

  it('Office files, archives and unknown types are refused; text is served as is', () => {
    for (const ext of ['.docx', '.xlsx', '.pptx', '.zip', '.exe', '']) assert.equal(prepareForClient(Buffer.from('PK\x03\x04'), ext).action, 'block', ext);
    const txt = Buffer.from('plain text', 'latin1');
    assert.ok(prepareForClient(txt, '.txt').buffer.equals(txt));
    assert.equal(prepareForClient(Buffer.from('broken'), '.png').action, 'block', 'unreadable files are never served raw');
  });
});

// MP4/MOV boxes: 4-byte size + 4-byte type + payload.
const box = (type, ...parts) => { const body = Buffer.concat(parts); const h = Buffer.alloc(8); h.writeUInt32BE(body.length + 8, 0); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]); };
const XMP_UUID = Buffer.from('be7acfcb97a942e89c71999491e3afac', 'hex');
function mp4() {
  return Buffer.concat([
    box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2', 'latin1')),
    box('moov',
      box('mvhd', Buffer.alloc(20)),
      box('trak', box('tkhd', Buffer.alloc(12)), box('udta', box('\xa9ART', Buffer.from(NAME, 'latin1')))),
      box('udta', box('meta', Buffer.from(`author ${NAME}`, 'latin1'))),
      box('meta', Buffer.from(`com.apple.quicktime.author ${NAME}`, 'latin1')),
    ),
    box('uuid', XMP_UUID, Buffer.from(`<dc:creator>${NAME}</dc:creator>`, 'latin1')),
    box('mdat', Buffer.from('udta frames stay untouched', 'latin1')),
  ]);
}
const boxTypes = (buf, start = 0, end = buf.length) => { const out = []; for (let i = start; i + 8 <= end; i += buf.readUInt32BE(i)) out.push(buf.toString('latin1', i + 4, i + 8)); return out; };

describe('client copies of videos and shared links', () => {
  it('MP4/MOV: metadata boxes become free space; the length and the video data stay the same', () => {
    const src = mp4();
    const copy = prepareForClient(src, '.mp4');
    assert.equal(copy.action, 'serve');
    assert.equal(copy.buffer.length, src.length, 'same length, so every sample offset still points at the right bytes');
    assert.deepEqual(boxTypes(copy.buffer), ['ftyp', 'moov', 'free', 'mdat']);
    const moov = copy.buffer.indexOf('moov', 0, 'latin1') - 4;
    assert.deepEqual(boxTypes(copy.buffer, moov + 8, moov + copy.buffer.readUInt32BE(moov)), ['mvhd', 'trak', 'free', 'free']);
    assert.ok(copy.buffer.includes('udta frames stay untouched', 0, 'latin1'), 'media data is never rewritten');
    assert.ok(!has(copy.buffer.subarray(0, copy.buffer.indexOf('mdat', 0, 'latin1')), 'udta'));
    assert.ok(!has(copy.buffer, NAME), 'the old contents are blanked, not just renamed');
    assert.deepEqual(prepareForClient(src, '.mov').buffer, copy.buffer);
  });

  it('a file that is not a valid MP4/MOV is refused, never served raw', () => {
    assert.equal(prepareForClient(Buffer.from('not a video at all'), '.mp4').action, 'block');
    const broken = mp4(); broken.writeUInt32BE(0xffffff, broken.indexOf('mvhd', 0, 'latin1') - 4);
    assert.equal(prepareForClient(broken, '.mov').action, 'block', 'a box that overruns the file');
  });

  it('a shared link keeps only its https address', () => {
    const src = Buffer.from(`[InternetShortcut]\r\nURL=https://drive.google.com/file/d/abc/view\r\nIconFile=C:\\Users\\${NAME}\\icon.ico\r\n`, 'utf8');
    const copy = prepareForClient(src, '.url');
    assert.equal(copy.action, 'serve');
    assert.equal(copy.buffer.toString('utf8'), '[InternetShortcut]\r\nURL=https://drive.google.com/file/d/abc/view\r\n');
    for (const bad of ['URL=http://example.com/x', 'URL=javascript:alert(1)', 'URL=https://user:pw@example.com/', 'URL=file:///etc/passwd', 'no address here']) {
      assert.equal(prepareForClient(Buffer.from(`[InternetShortcut]\r\n${bad}\r\n`), '.url').action, 'block', bad);
    }
    assert.equal(linkAddress(Buffer.from('URL=https://example.com/a b')), null, 'one address only');
  });

  it('every delivery has a kind the portal can show', () => {
    assert.deepEqual(['.jpg', '.png', '.pdf', '.mp4', '.mov', '.url', '.txt', ''].map(deliveryKind), ['image', 'image', 'pdf', 'video', 'video', 'link', 'document', 'document']);
  });
});

describe('client file names', () => {
  it('use the deliverable title and version, never the uploaded name', () => {
    assert.equal(safeClientFilename('Homepage hero.pdf', 2, '.pdf'), 'Homepage hero v2.pdf');
    assert.equal(safeClientFilename('../Logo / final', 1, '.png'), '.. Logo final v1.png');
    assert.equal(safeClientFilename('', null, '.pdf'), 'Delivery.pdf');
  });
});
