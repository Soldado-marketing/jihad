/**
 * Side-by-side comparison of two versions of one file (plan row D04).
 *
 * Pure helpers, no React: which versions can be compared, which pair opens by
 * default, how a version is shown and how two sizes differ. The component in
 * `components/files/file-version-compare.tsx` renders on top of these, and
 * `test/file-version-compare.test.mjs` checks them directly.
 */

export type CompareVersion = {
  id: string;
  versionNumber: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'QUARANTINED' | 'BLOCKED';
  originalName?: string | null;
  sizeBytes?: number | null;
  createdAt?: string;
};

/** A quarantined or blocked version has no readable bytes, so it is left out. */
const COMPARABLE = new Set<CompareVersion['status']>(['ACTIVE', 'SUPERSEDED']);

/** Versions that can be opened, newest first. */
export function comparableVersions<T extends CompareVersion>(versions: readonly T[]): T[] {
  return versions
    .filter((v) => COMPARABLE.has(v.status))
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

/** The newest two comparable versions, or null when there is nothing to compare yet. */
export function defaultComparePair(
  versions: readonly CompareVersion[],
): { olderId: string; newerId: string } | null {
  const [newer, older] = comparableVersions(versions);
  if (!newer || !older) return null;
  return { olderId: older.id, newerId: newer.id };
}

/**
 * How one version is shown. The API serves images, PDFs and MP4/MOV video
 * inline (everything else is attachment-only), so those render in the page and
 * every other type is compared by its details.
 */
export type PreviewKind = 'image' | 'pdf' | 'video' | 'metadata';

export function previewKind(originalName: string | null | undefined): PreviewKind {
  const name = originalName ?? '';
  if (/\.(png|jpe?g|gif|webp)$/i.test(name)) return 'image';
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (/\.(mp4|mov)$/i.test(name)) return 'video';
  return 'metadata';
}

export function formatBytes(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "12.0 KB larger", "3.2 MB smaller", "Same size", or "" when a size is unknown. */
export function formatSizeDelta(
  older: number | null | undefined,
  newer: number | null | undefined,
): string {
  if (typeof older !== 'number' || typeof newer !== 'number') return '';
  if (older === newer) return 'Same size';
  const diff = newer - older;
  return `${formatBytes(Math.abs(diff))} ${diff > 0 ? 'larger' : 'smaller'}`;
}
