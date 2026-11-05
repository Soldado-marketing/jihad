/**
 * HTTP byte-range parsing for the file content routes (C05).
 *
 * Only the single-range form of RFC 9110 §14 is served: `bytes=a-b`, `bytes=a-`
 * and `bytes=-k`. Anything else the API is allowed to ignore (several ranges,
 * another unit, malformed syntax) is answered with the whole file as `200`,
 * which is what a browser expects from a server that "does not do ranges".
 * A range that is syntactically fine but lies entirely outside the file is
 * `unsatisfiable` → 416 with `Content-Range: bytes * /<size>`.
 *
 * Pure function, no I/O - unit-tested directly. The parsed numbers are
 * re-issued to storage as a new header; the caller's header is never forwarded.
 */

export type ByteRange =
  | { kind: 'full' }
  | { kind: 'range'; start: number; end: number }
  | { kind: 'unsatisfiable' };

const SINGLE_RANGE = /^bytes=(\d*)-(\d*)$/;
/** Larger values cannot be represented exactly and would never fit a real file. */
const MAX_OFFSET = Number.MAX_SAFE_INTEGER;

function toOffset(digits: string): number | null {
  if (digits.length > 16) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) && value <= MAX_OFFSET ? value : null;
}

/**
 * Resolves a `Range` request header against a representation of `size` bytes.
 * `end` in the result is inclusive, as in `Content-Range`.
 */
export function parseByteRange(header: string | undefined | null, size: number): ByteRange {
  if (!Number.isSafeInteger(size) || size < 0) return { kind: 'full' };
  if (header === undefined || header === null) return { kind: 'full' };
  const match = SINGLE_RANGE.exec(header.trim());
  if (!match) return { kind: 'full' };
  const [, first, last] = match;
  if (first === '' && last === '') return { kind: 'full' };

  // Suffix form: the final k bytes. k = 0 selects nothing → unsatisfiable;
  // k ≥ size selects the whole representation.
  if (first === '') {
    const suffix = toOffset(last);
    if (suffix === null) return { kind: 'full' };
    if (suffix === 0 || size === 0) return { kind: 'unsatisfiable' };
    const start = Math.max(0, size - suffix);
    return { kind: 'range', start, end: size - 1 };
  }

  const start = toOffset(first);
  if (start === null) return { kind: 'full' };
  if (last !== '') {
    const requestedEnd = toOffset(last);
    if (requestedEnd === null) return { kind: 'full' };
    // first-pos greater than last-pos makes the whole header invalid → ignored.
    if (requestedEnd < start) return { kind: 'full' };
    if (start >= size) return { kind: 'unsatisfiable' };
    return { kind: 'range', start, end: Math.min(requestedEnd, size - 1) };
  }
  if (start >= size) return { kind: 'unsatisfiable' };
  return { kind: 'range', start, end: size - 1 };
}

/** `Content-Range` value for a 206 response. */
export function contentRangeHeader(start: number, end: number, size: number): string {
  return `bytes ${start}-${end}/${size}`;
}

/** `Content-Range` value for a 416 response. */
export function unsatisfiableRangeHeader(size: number): string {
  return `bytes */${size}`;
}

/**
 * Parses the `Content-Range` an S3-compatible store returns for a ranged
 * GetObject (`bytes a-b/N`). Returns null for anything else, so the caller can
 * refuse to echo a value it does not understand.
 */
export function parseStoredContentRange(value: string | undefined): { start: number; end: number; size: number } | null {
  if (!value) return null;
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(value.trim());
  if (!match) return null;
  const start = toOffset(match[1]);
  const end = toOffset(match[2]);
  const size = toOffset(match[3]);
  if (start === null || end === null || size === null) return null;
  if (end < start || end >= size) return null;
  return { start, end, size };
}
