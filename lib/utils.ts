import mime from 'mime-types';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function formatDateTime(
  value: string | null | undefined,
  locale = 'de-DE',
) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatShortDate(value: string | null | undefined, locale = 'de-DE') {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function truncate(input: string, maxLength = 180) {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function cleanMultilineInput(input: string) {
  return input
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

export function parseHashtags(input: string) {
  return cleanMultilineInput(input)
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
}

export function joinHashtags(tags: string[]) {
  return tags.join(' ');
}

export function isImageMimeType(mimeType: string) {
  return mimeType.startsWith('image/');
}

export function inferMimeType(fileName: string, fallback = 'application/octet-stream') {
  return mime.lookup(fileName) || fallback;
}

export function arrayBufferToBuffer(arrayBuffer: ArrayBuffer) {
  return Buffer.from(arrayBuffer);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
