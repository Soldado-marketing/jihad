import { inflateSync, constants as zlibConstants } from 'node:zlib';

/**
 * What a CLIENT receives when it downloads a file (owner decision 2026-11-02).
 *
 * The stored original is never changed. For each allowed upload format the
 * client copy is prepared here, or refused with a reason staff can act on:
 *
 *   JPEG, PNG, GIF, WebP  serve: identifying metadata blocks removed (EXIF,
 *                         XMP, IPTC, comments, text chunks); the image data
 *                         is copied byte for byte and the EXIF orientation is
 *                         kept, so nothing is re-encoded or rotated. A JPEG
 *                         carrying C2PA content credentials (a signature) is
 *                         refused rather than altered.
 *   PDF                   serve: author fields (Info /Author /Creator, XMP
 *                         creator/author) blanked in place with spaces, so no
 *                         byte offset moves. Refused when it cannot be checked
 *                         or edited that way: encrypted, signed with author
 *                         data, author data inside compressed streams, review
 *                         comments carrying author names.
 *   MP4, MOV              serve: metadata boxes (udta, meta, XMP uuid) are
 *                         renamed to 'free' in place, which players skip; no
 *                         byte moves, so sample offsets stay valid.
 *   URL (shared link)     serve: rebuilt to the single https address only.
 *                         The page behind the link (e.g. a Drive owner name)
 *                         is outside MAOS and cannot be checked.
 *   TXT, CSV              serve unchanged: no metadata container.
 *   DOCX, XLSX, PPTX, ZIP refused: authors live in many places inside the
 *                         package (properties, comments, tracked changes) and
 *                         cannot be verified; export to PDF instead.
 *
 * This removes known metadata only. It does not and cannot anonymise what the
 * file itself shows (names written in the document, visible signatures).
 */

export type ClientCopy =
  | { action: 'serve'; buffer: Buffer; removed: string[] }
  | { action: 'block'; reason: string };

const serve = (buffer: Buffer, removed: string[] = []): ClientCopy => ({ action: 'serve', buffer, removed });
const block = (reason: string): ClientCopy => ({ action: 'block', reason });

/** Prepares the client copy of one stored file; `extension` includes the dot, lower case. */
export function prepareForClient(buffer: Buffer, extension: string): ClientCopy {
  try {
    switch (extension) {
      case '.jpg':
      case '.jpeg': return stripJpeg(buffer);
      case '.png': return stripPng(buffer);
      case '.gif': return stripGif(buffer);
      case '.webp': return stripWebp(buffer);
      case '.pdf': return cleanPdf(buffer);
      case '.mp4':
      case '.mov': return neutraliseMp4(buffer);
      case '.url': return cleanLink(buffer);
      case '.txt':
      case '.csv': return serve(buffer);
      case '.docx':
      case '.xlsx':
      case '.pptx':
        return block('Office files can carry author names in many places and are not sent to clients. Export it to PDF and upload that version.');
      case '.zip':
        return block('ZIP archives cannot be checked for author data and are not sent to clients. Upload the files one by one.');
      default:
        return block('This file type is not cleared for clients.');
    }
  } catch {
    // Never fall back to the original when the structure could not be read.
    return block('The file could not be checked for author data. Re-export it and upload a new version.');
  }
}

/** The client-facing name: the deliverable's title and version, never the uploaded file name. */
export function safeClientFilename(assetName: string, versionNumber: number | null, extension: string): string {
  const title = assetName.replace(/\.[A-Za-z0-9]{1,8}$/, '')
    .normalize('NFKD').replace(/[^\w .-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Delivery';
  return `${title}${versionNumber ? ` v${versionNumber}` : ''}${/^\.[a-z0-9]{1,8}$/.test(extension) ? extension : ''}`;
}

// ── JPEG ─────────────────────────────────────────────────────────────────────

function stripJpeg(buf: Buffer): ClientCopy {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return block('Not a valid JPEG image.');
  const parts: Buffer[] = [buf.subarray(0, 2)];
  const removed = new Set<string>();
  let orientation = 1;
  let sawExif = false;
  let afterApp0 = 1; // index in parts after which a rebuilt EXIF goes
  let i = 2;
  let sawScan = false;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error('jpeg marker expected');
    const marker = buf[i + 1];
    if (marker === 0xff) { i += 1; continue; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { parts.push(buf.subarray(i, i + 2)); i += 2; continue; }
    if (marker === 0xd9) { parts.push(buf.subarray(i)); break; }
    const end = i + 2 + buf.readUInt16BE(i + 2);
    if (end > buf.length) throw new Error('jpeg segment overruns');
    if (marker === 0xda) { parts.push(buf.subarray(i)); sawScan = true; break; }
    const data = buf.subarray(i + 4, end);
    const keep =
      (marker === 0xe0 && /^JF(IF|XX)\0/.test(data.subarray(0, 5).toString('latin1'))) ||
      (marker === 0xe2 && data.subarray(0, 12).toString('latin1') === 'ICC_PROFILE\0') ||
      (marker === 0xee && data.subarray(0, 5).toString('latin1') === 'Adobe') ||
      marker < 0xe0 || (marker > 0xef && marker !== 0xfe);
    if (marker === 0xeb && /c2pa|jumb/i.test(data.toString('latin1'))) {
      return block('The image carries signed content credentials (C2PA), which would be broken. Export it without them.');
    }
    // The first EXIF block is the one viewers honour; a later one never overrides it.
    if (marker === 0xe1 && data.subarray(0, 6).toString('latin1') === 'Exif\0\0' && !sawExif) {
      sawExif = true;
      orientation = exifOrientation(data.subarray(6));
    }
    if (keep) {
      parts.push(buf.subarray(i, end));
      if (marker === 0xe0 && parts.length === 2) afterApp0 = 2;
    } else {
      removed.add(marker === 0xfe ? 'comment' : marker === 0xe1 ? 'EXIF/XMP' : marker === 0xed ? 'IPTC' : `APP${marker - 0xe0}`);
    }
    i = end;
  }
  if (!sawScan) throw new Error('jpeg without image data');
  if (orientation >= 2 && orientation <= 8) parts.splice(afterApp0, 0, orientationOnlyExif(orientation));
  return serve(Buffer.concat(parts), [...removed]);
}

/** Reads the Orientation tag (0x0112) from a TIFF block; 1 when absent or unreadable. */
function exifOrientation(tiff: Buffer): number {
  if (tiff.length < 8) return 1;
  const le = tiff.toString('latin1', 0, 2) === 'II';
  const u16 = (o: number) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o: number) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  const ifd = u32(4);
  if (ifd + 2 > tiff.length) return 1;
  const count = u16(ifd);
  for (let n = 0; n < count; n++) {
    const e = ifd + 2 + n * 12;
    if (e + 12 > tiff.length) return 1;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return 1;
}

/** A minimal EXIF block holding only the orientation, so a rotated photo still shows upright. */
function orientationOnlyExif(orientation: number): Buffer {
  const tiff = Buffer.alloc(26);
  tiff.write('MM', 0, 'latin1'); tiff.writeUInt16BE(42, 2); tiff.writeUInt32BE(8, 4);
  tiff.writeUInt16BE(1, 8); // one entry
  tiff.writeUInt16BE(0x0112, 10); tiff.writeUInt16BE(3, 12); tiff.writeUInt32BE(1, 14); tiff.writeUInt16BE(orientation, 18);
  tiff.writeUInt32BE(0, 22); // no next IFD
  const header = Buffer.from([0xff, 0xe1, 0, 0]);
  header.writeUInt16BE(2 + 6 + tiff.length, 2);
  return Buffer.concat([header, Buffer.from('Exif\0\0', 'latin1'), tiff]);
}

// ── PNG ──────────────────────────────────────────────────────────────────────

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_METADATA = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

function stripPng(buf: Buffer): ClientCopy {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) return block('Not a valid PNG image.');
  const parts: Buffer[] = [PNG_SIGNATURE];
  const removed = new Set<string>();
  let i = 8;
  let ended = false;
  while (i + 12 <= buf.length) {
    const end = i + 12 + buf.readUInt32BE(i);
    if (end > buf.length) throw new Error('png chunk overruns');
    const type = buf.toString('latin1', i + 4, i + 8);
    if (PNG_METADATA.has(type)) removed.add(type); else parts.push(buf.subarray(i, end));
    i = end;
    if (type === 'IEND') { ended = true; break; }
  }
  if (!ended) throw new Error('png without IEND');
  return serve(Buffer.concat(parts), [...removed]);
}

// ── GIF ──────────────────────────────────────────────────────────────────────

function stripGif(buf: Buffer): ClientCopy {
  if (!/^GIF8[79]a$/.test(buf.toString('latin1', 0, 6))) return block('Not a valid GIF image.');
  const subBlocksEnd = (at: number) => { let p = at; while (buf[p] !== 0) { p += buf[p] + 1; if (p >= buf.length) throw new Error('gif overrun'); } return p + 1; };
  let i = 13;
  if (buf[10] & 0x80) i += 3 * (1 << ((buf[10] & 7) + 1));
  const parts: Buffer[] = [buf.subarray(0, i)];
  const removed = new Set<string>();
  for (;;) {
    if (i >= buf.length) throw new Error('gif without trailer');
    const b = buf[i];
    if (b === 0x3b) { parts.push(buf.subarray(i, i + 1)); break; }
    if (b === 0x2c) {
      let p = i + 10;
      if (buf[i + 9] & 0x80) p += 3 * (1 << ((buf[i + 9] & 7) + 1));
      const end = subBlocksEnd(p + 1);
      parts.push(buf.subarray(i, end)); i = end; continue;
    }
    if (b !== 0x21) throw new Error('gif block expected');
    const label = buf[i + 1];
    const end = subBlocksEnd(i + 2);
    const appId = label === 0xff ? buf.toString('latin1', i + 3, i + 3 + 11) : '';
    if (label === 0xfe) removed.add('comment');
    else if (label === 0xff && appId === 'XMP DataXMP') removed.add('XMP');
    else parts.push(buf.subarray(i, end));
    i = end;
  }
  return serve(Buffer.concat(parts), [...removed]);
}

// ── WebP ─────────────────────────────────────────────────────────────────────

function stripWebp(buf: Buffer): ClientCopy {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') return block('Not a valid WebP image.');
  const chunks: Buffer[] = [];
  const removed = new Set<string>();
  let i = 12;
  while (i + 8 <= buf.length) {
    const size = buf.readUInt32LE(i + 4);
    const end = i + 8 + size + (size & 1);
    if (i + 8 + size > buf.length) throw new Error('webp chunk overruns');
    const type = buf.toString('latin1', i, i + 4);
    if (type === 'EXIF' || type === 'XMP ') removed.add(type.trim());
    else chunks.push(Buffer.from(buf.subarray(i, Math.min(end, buf.length))));
    i = end;
  }
  const vp8x = chunks.find((c) => c.toString('latin1', 0, 4) === 'VP8X');
  if (vp8x) vp8x[8] &= ~0x0c; // EXIF and XMP flags off
  const body = Buffer.concat(chunks);
  const header = Buffer.from('RIFF\0\0\0\0WEBP', 'latin1');
  header.writeUInt32LE(4 + body.length, 4);
  return serve(Buffer.concat([header, body]), [...removed]);
}

// ── MP4 / MOV ────────────────────────────────────────────────────────────────

const XMP_UUID = 'be7acfcb97a942e89c71999491e3afac';
const MP4_CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'mvex', 'moof', 'traf']);

function neutraliseMp4(buf: Buffer): ClientCopy {
  const out = Buffer.from(buf);
  const removed = new Set<string>();
  const walk = (start: number, end: number, depth: number) => {
    let i = start;
    while (i + 8 <= end) {
      let size = buf.readUInt32BE(i);
      let header = 8;
      if (size === 1) {
        if (i + 16 > end) throw new Error('mp4 box overruns');
        const big = buf.readBigUInt64BE(i + 8);
        if (big > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('mp4 box too large');
        size = Number(big); header = 16;
      } else if (size === 0) size = end - i;
      if (size < header || i + size > end) throw new Error('mp4 box overruns');
      const type = buf.toString('latin1', i + 4, i + 8);
      const isXmp = type === 'uuid' && buf.subarray(i + header, i + header + 16).toString('hex') === XMP_UUID;
      if (type === 'udta' || type === 'meta' || isXmp) {
        // Free space players skip, with the old contents blanked: renaming alone would leave the text in the file.
        out.write('free', i + 4, 'latin1');
        out.fill(0, i + header, i + size);
        removed.add(isXmp ? 'XMP' : type);
      } else if (MP4_CONTAINERS.has(type) && depth < 8) {
        walk(i + header, i + size, depth + 1);
      }
      i += size;
    }
  };
  if (buf.toString('latin1', 4, 8) === 'ftyp' || ['moov', 'wide', 'mdat', 'free'].includes(buf.toString('latin1', 4, 8))) walk(0, buf.length, 0);
  else return block('Not a valid MP4/MOV video.');
  return serve(out, [...removed]);
}

// ── Shared link (.url) ───────────────────────────────────────────────────────

/** Reads the address from an Internet-shortcut file. Only a plain https address without credentials is passed on. */
export function linkAddress(buf: Buffer): string | null {
  const m = /^URL=(\S+)\s*$/m.exec(buf.toString('utf8'));
  if (!m) return null;
  try {
    const url = new URL(m[1]);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanLink(buf: Buffer): ClientCopy {
  const url = linkAddress(buf);
  if (!url) return block('A shared link must be a single https address.');
  return serve(Buffer.from(`[InternetShortcut]\r\nURL=${url}\r\n`, 'utf8'));
}

// ── PDF ──────────────────────────────────────────────────────────────────────

const INFO_KEYS = ['Author', 'Creator'];
const XMP_FIELDS = ['dc:creator', 'dc:contributor', 'pdf:Author', 'xmpRights:Owner', 'photoshop:AuthorsPosition', 'photoshop:CaptionWriter'];
const MARKUP = /\/Subtype\s*\/(Text|FreeText|Line|Square|Circle|Polygon|PolyLine|Highlight|Underline|Squiggly|StrikeOut|Stamp|Caret|Ink|FileAttachment|Sound|Redact|Popup)\b/;
const HAS_T = /\/T\s*[(<]/;

function cleanPdf(buf: Buffer): ClientCopy {
  if (buf.toString('latin1', 0, 5) !== '%PDF-') return block('Not a valid PDF.');
  const s = buf.toString('latin1');
  if (/\/Encrypt\s/.test(s)) return block('Encrypted PDFs cannot be checked for author data. Upload an unencrypted export.');
  const signed = /\/ByteRange\s*\[/.test(s);
  const out = Buffer.from(buf);
  const edits: [number, number][] = [];

  // Document information dictionaries (one per revision).
  for (const m of s.matchAll(/\/Info\s+(\d+)\s+(\d+)\s+R/g)) {
    const obj = new RegExp(`(^|[^\\d])${m[1]}\\s+${m[2]}\\s+obj\\b`).exec(s);
    if (!obj) return block('The PDF keeps its document details in a compressed form that cannot be checked. Re-export it (for example with "Save as PDF") and upload a new version.');
    const start = obj.index + obj[0].length;
    const end = s.indexOf('endobj', start);
    if (end < 0) throw new Error('pdf object without endobj');
    for (const key of INFO_KEYS) {
      for (const k of s.slice(start, end).matchAll(new RegExp(`/${key}\\s*`, 'g'))) {
        const at = start + (k.index ?? 0) + k[0].length;
        const span = pdfStringSpan(s, at);
        if (!span) return block('The PDF stores its author in a form that cannot be checked. Re-export it and upload a new version.');
        if (span[1] - span[0] > 0 && /\S/.test(s.slice(span[0], span[1]))) edits.push(span);
      }
    }
  }

  // Objects: uncompressed ones are read directly, compressed object and XMP streams are inflated to look inside.
  for (const o of s.matchAll(/(\d+)\s+(\d+)\s+obj\b/g)) {
    const start = (o.index ?? 0) + o[0].length;
    const end = s.indexOf('endobj', start);
    if (end < 0) break;
    const body = s.slice(start, end);
    const streamAt = body.indexOf('stream');
    const dict = streamAt >= 0 ? body.slice(0, streamAt) : body;
    if (MARKUP.test(dict) && HAS_T.test(dict)) return block('The PDF contains review comments with author names. Remove or flatten the comments and upload a new version.');
    if (streamAt < 0) continue;
    const isMeta = /\/Type\s*\/Metadata\b/.test(dict);
    const isObjStm = /\/Type\s*\/ObjStm\b/.test(dict);
    if (!isMeta && !isObjStm) continue;
    let dataStart = start + streamAt + 6;
    if (s[dataStart] === '\r') dataStart++;
    if (s[dataStart] === '\n') dataStart++;
    const dataEnd = s.indexOf('endstream', dataStart);
    if (dataEnd < 0) throw new Error('pdf stream without endstream');
    const filtered = /\/Filter\b/.test(dict);
    if (filtered) {
      if (!/\/Filter\s*\/FlateDecode\b/.test(dict) || /\/DecodeParms\b/.test(dict)) return block('The PDF has compressed data that cannot be checked. Re-export it and upload a new version.');
      const text = inflateSync(buf.subarray(dataStart, dataEnd), { finishFlush: zlibConstants.Z_SYNC_FLUSH }).toString('latin1');
      const found = isMeta ? xmpIdentitySpans(text).length > 0
        : (MARKUP.test(text) && HAS_T.test(text)) || INFO_KEYS.some((k) => new RegExp(`/${k}\\s*\\((?!\\s*\\))|/${k}\\s*<[^>]*[0-9A-Fa-f]`).test(text));
      if (found) return block('The PDF keeps author names in compressed data that cannot be cleaned safely. Re-export it without document properties and upload a new version.');
    } else if (isMeta) {
      for (const [a, b] of xmpIdentitySpans(s.slice(dataStart, dataEnd))) edits.push([dataStart + a, dataStart + b]);
    }
  }

  if (!edits.length) return serve(buf);
  if (signed) return block('The PDF is digitally signed and contains author data; changing it would break the signature. Ask for a signed version without author data.');
  for (const [a, b] of edits) out.fill(0x20, a, b); // same length: every offset stays valid
  return serve(out, ['author metadata']);
}

/** The interior of a PDF string value at `at` (literal or hex), or null for anything else (e.g. an indirect reference). */
function pdfStringSpan(s: string, at: number): [number, number] | null {
  if (s[at] === '<' && s[at + 1] !== '<') {
    const end = s.indexOf('>', at);
    return end < 0 ? null : [at + 1, end];
  }
  if (s[at] !== '(') return null;
  let depth = 0;
  for (let p = at; p < s.length; p++) {
    const c = s[p];
    if (c === '\\') { p++; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return [at + 1, p];
  }
  return null;
}

/** Character ranges of identity values inside an XMP packet: element text and attribute values. */
function xmpIdentitySpans(x: string): [number, number][] {
  const spans: [number, number][] = [];
  for (const f of XMP_FIELDS) {
    const name = f.replace(':', '\\:');
    for (const m of x.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'g'))) {
      const inner = (m.index ?? 0) + m[0].indexOf('>') + 1;
      const text = m[1];
      for (const t of text.matchAll(/>([^<]+)</g)) {
        if (/\S/.test(t[1])) spans.push([inner + (t.index ?? 0) + 1, inner + (t.index ?? 0) + 1 + t[1].length]);
      }
      if (!text.includes('<') && /\S/.test(text)) spans.push([inner, inner + text.length]);
    }
    for (const m of x.matchAll(new RegExp(`\\b${name}="([^"]*)"`, 'g'))) {
      if (/\S/.test(m[1])) { const a = (m.index ?? 0) + m[0].indexOf('"') + 1; spans.push([a, a + m[1].length]); }
    }
  }
  return spans;
}

/** How the client portal shows a deliverable, by its stored extension. */
export function deliveryKind(extension: string): 'image' | 'pdf' | 'video' | 'link' | 'document' {
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) return 'image';
  if (extension === '.pdf') return 'pdf';
  if (extension === '.mp4' || extension === '.mov') return 'video';
  if (extension === '.url') return 'link';
  return 'document';
}
