export type FileVisibility = 'INTERNAL' | 'CLIENT_VISIBLE';

const labels: Record<FileVisibility, string> = {
  CLIENT_VISIBLE: 'Client-visible',
  INTERNAL: 'Internal',
};

export function FileVisibilityBadge({ visibility }: { visibility: FileVisibility }) {
  return (
    <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-slate-600">
      {labels[visibility]}
    </span>
  );
}
