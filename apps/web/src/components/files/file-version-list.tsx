import { EmptyState } from '@/components/states/empty-state';

export type FileVersionListItem = {
  id: string;
  versionNumber: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'QUARANTINED' | 'BLOCKED';
};

export function FileVersionList({ versions }: { versions: FileVersionListItem[] }) {
  if (versions.length === 0) {
    return (
      <EmptyState
        title="No versions yet"
        description="Version metadata will appear here when file version records exist."
      />
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift" aria-label="File version list">
      {versions.map((version) => (
        <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
          <span className="font-semibold text-ink">Version {version.versionNumber}</span>
          <span className="text-sm text-slate-600">{version.status}</span>
        </li>
      ))}
    </ul>
  );
}
