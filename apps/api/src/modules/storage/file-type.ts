/**
 * Phase 3 - Upload validation: extension allow-list, MIME agreement, and
 * content-signature (magic byte) verification.
 *
 * Why all three: a client controls both the filename and the Content-Type
 * header, so neither can be trusted on its own. The signature check is what
 * actually proves the bytes are what they claim to be.
 *
 * Pure functions, no I/O - unit-testable directly.
 */

import { extensionOf } from './object-key';

export class UnsupportedFileTypeError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'UnsupportedFileTypeError';
  }
}

export class FileTooLargeError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'FileTooLargeError';
  }
}

interface FileTypeRule {
  /** Canonical content type stored and served back for this extension. */
  contentType: string;
  /**
   * Leading byte signatures, as hex strings. An empty array means the format
   * has no reliable signature (plain text) and is checked by other means.
   */
  signatures: string[];
  /** Byte offset at which the signature starts. */
  signatureOffset?: number;
  /**
   * Safe to render inline in a browser. Anything that can execute script in
   * the page origin (HTML, SVG) is deliberately absent from this set.
   */
  inlineSafe: boolean;
}

/**
 * The allow-list. An extension that is not listed here cannot be uploaded.
 *
 * Deliberately excluded: .svg and .html (stored XSS when rendered inline),
 * and every executable/script format.
 */
export const ALLOWED_FILE_TYPES: Readonly<Record<string, FileTypeRule>> = Object.freeze({
  '.png': { contentType: 'image/png', signatures: ['89504e470d0a1a0a'], inlineSafe: true },
  '.jpg': { contentType: 'image/jpeg', signatures: ['ffd8ff'], inlineSafe: true },
  '.jpeg': { contentType: 'image/jpeg', signatures: ['ffd8ff'], inlineSafe: true },
  '.gif': { contentType: 'image/gif', signatures: ['474946383761', '474946383961'], inlineSafe: true },
  '.webp': { contentType: 'image/webp', signatures: ['52494646'], inlineSafe: true },
  '.pdf': { contentType: 'application/pdf', signatures: ['255044462d'], inlineSafe: true },
  '.txt': { contentType: 'text/plain', signatures: [], inlineSafe: false },
  '.csv': { contentType: 'text/csv', signatures: [], inlineSafe: false },
  '.zip': { contentType: 'application/zip', signatures: ['504b0304', '504b0506', '504b0708'], inlineSafe: false },
  '.docx': {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signatures: ['504b0304', '504b0506', '504b0708'],
    inlineSafe: false,
  },
  '.xlsx': {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    signatures: ['504b0304', '504b0506', '504b0708'],
    inlineSafe: false,
  },
  '.pptx': {
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    signatures: ['504b0304', '504b0506', '504b0708'],
    inlineSafe: false,
  },
  // Client deliveries (owner decision 2026-11-02): videos and shared links.
  // MP4/MOV carry 'ftyp' (or an old QuickTime atom) at byte 4.
  '.mp4': { contentType: 'video/mp4', signatures: ['66747970'], signatureOffset: 4, inlineSafe: true },
  '.mov': { contentType: 'video/quicktime', signatures: ['66747970', '6d6f6f76', '77696465', '6d646174', '66726565'], signatureOffset: 4, inlineSafe: true },
  // A link (e.g. Google Drive) stored as a standard Internet-shortcut file.
  '.url': { contentType: 'text/plain', signatures: [], inlineSafe: false },
});

/** Extensions accepted by the upload endpoint. */
export function allowedExtensions(): string[] {
  return Object.keys(ALLOWED_FILE_TYPES);
}

/** Reads the first bytes of a buffer as a lowercase hex string. */
function leadingHex(buffer: Buffer, byteLength: number, offset = 0): string {
  return buffer.subarray(offset, offset + byteLength).toString('hex').toLowerCase();
}

/**
 * True when the buffer starts with one of the rule's signatures.
 * A rule with no signatures always passes this check.
 */
export function matchesSignature(buffer: Buffer, rule: FileTypeRule): boolean {
  if (rule.signatures.length === 0) return true;

  const offset = rule.signatureOffset ?? 0;
  return rule.signatures.some((signature) => {
    const byteLength = signature.length / 2;
    return leadingHex(buffer, byteLength, offset) === signature.toLowerCase();
  });
}

/**
 * WEBP needs a second check: 'RIFF' is a container magic shared with other
 * formats, so the 'WEBP' fourcc at offset 8 is what distinguishes it.
 */
function isWebp(buffer: Buffer): boolean {
  return buffer.subarray(8, 12).toString('ascii') === 'WEBP';
}

/** Text formats must not contain NUL bytes in their leading window. */
function looksLikeText(buffer: Buffer): boolean {
  const window = buffer.subarray(0, 4096);
  for (let index = 0; index < window.length; index += 1) {
    if (window[index] === 0) return false;
  }
  return true;
}

export interface ValidateUploadInput {
  originalName: string;
  /** Content-Type as declared by the client. Advisory only. */
  declaredContentType?: string;
  buffer: Buffer;
  maxBytes: number;
}

export interface ValidatedUpload {
  extension: string;
  /** Server-decided content type. The client's declaration is never trusted. */
  contentType: string;
  sizeBytes: number;
  inlineSafe: boolean;
}

/**
 * Validates a single upload end to end.
 *
 * Order matters: size is checked before any content inspection so an oversized
 * body is rejected as cheaply as possible.
 */
export function validateUpload(input: ValidateUploadInput): ValidatedUpload {
  const { originalName, buffer, maxBytes } = input;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new UnsupportedFileTypeError('Uploaded file is empty.');
  }
  if (buffer.length > maxBytes) {
    // A sentence for the person who chose the file (shown as-is by the web app),
    // with sizes they can read; the code FILE_TOO_LARGE stays on the response.
    throw new FileTooLargeError(
      `This file is ${describeSize(buffer.length)}; the upload limit is ${describeSize(maxBytes)}.`,
    );
  }

  const extension = extensionOf(originalName);
  if (extension === '') {
    throw new UnsupportedFileTypeError('Uploaded file has no usable extension.');
  }

  const rule = ALLOWED_FILE_TYPES[extension];
  if (!rule) {
    throw new UnsupportedFileTypeError(
      `File type ${extension} is not allowed. Allowed types: ${allowedExtensions().join(', ')}.`,
    );
  }

  if (!matchesSignature(buffer, rule)) {
    throw new UnsupportedFileTypeError(
      `File content does not match the ${extension} format.`,
    );
  }
  if (extension === '.webp' && !isWebp(buffer)) {
    throw new UnsupportedFileTypeError('File content does not match the .webp format.');
  }
  if (rule.signatures.length === 0 && !looksLikeText(buffer)) {
    throw new UnsupportedFileTypeError(
      `File content does not match the ${extension} format.`,
    );
  }

  return {
    contentType: rule.contentType,
    extension,
    inlineSafe: rule.inlineSafe,
    sizeBytes: buffer.length,
  };
}

/**
 * Decides the Content-Disposition for a download.
 *
 * 'inline' is granted only for formats on the inline-safe list; everything else
 * is forced to 'attachment' so the browser downloads rather than renders it.
 */
export function resolveDisposition(
  contentType: string,
  requested: 'inline' | 'attachment',
): 'inline' | 'attachment' {
  if (requested !== 'inline') return 'attachment';

  const inlineSafeTypes = new Set(
    Object.values(ALLOWED_FILE_TYPES)
      .filter((rule) => rule.inlineSafe)
      .map((rule) => rule.contentType),
  );

  return inlineSafeTypes.has(contentType) ? 'inline' : 'attachment';
}

/**
 * Escapes a filename for a Content-Disposition header.
 * Quotes and backslashes are removed rather than escaped so the header can
 * never be split or extended by a crafted filename.
 */
export function contentDispositionFilename(name: string): string {
  const ascii = name.replace(/["\\]/g, '').replace(/[^\x20-\x7e]/g, '_');
  return ascii === '' ? 'file' : ascii;
}

/** "25 MiB", "3.2 MiB", "512.0 KiB" or "900 bytes" for size sentences shown to people. */
export function describeSize(bytes: number): string {
  const mib = bytes / (1024 * 1024);
  if (mib >= 1) return Number.isInteger(mib) ? `${mib} MiB` : `${mib.toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} bytes`;
}
