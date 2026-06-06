'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FileVisibilityBadge, type FileVisibility } from './file-visibility-badge';
import type { FileListItem } from './file-list';

type ClientFileRecordPanelProps = {
  files: FileListItem[];
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function ClientFileRecordPanel({ files }: ClientFileRecordPanelProps) {
  const [records, setRecords] = useState(files);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<FileVisibility>('CLIENT_VISIBLE');

  function createRecord() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const id = slugify(trimmedName) || `file-${records.length + 1}`;
    setRecords((currentRecords) => [
      {
        id,
        name: trimmedName,
        versionCount: 1,
        visibility,
      },
      ...currentRecords,
    ]);
    setName('');
    setVisibility('CLIENT_VISIBLE');
  }

  return (
    <section aria-labelledby="client-file-record-title" className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-md border border-line bg-panel p-5 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Client file record
        </p>
        <h3 id="client-file-record-title" className="mt-2 text-xl font-semibold tracking-tight text-ink">
          Create a client-visible file
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This creates a preview record only. Real binary storage and signed URLs start
          after staging storage is connected.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink">File name</span>
            <input
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-focus"
              onChange={(event) => setName(event.target.value)}
              placeholder="Client campaign brief"
              type="text"
              value={name}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Visibility</span>
            <select
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-focus"
              onChange={(event) => setVisibility(event.target.value as FileVisibility)}
              value={visibility}
            >
              <option value="CLIENT_VISIBLE">Client-visible</option>
              <option value="INTERNAL">Internal</option>
            </select>
          </label>

          <button
            className="w-full rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:bg-slate-800"
            onClick={createRecord}
            type="button"
          >
            Create preview record
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-panel shadow-card">
        <div className="border-b border-line px-4 py-3">
          <h3 className="font-semibold text-ink">File records</h3>
          <p className="mt-1 text-sm text-slate-600">
            Client-visible records are safe for the client portal boundary.
          </p>
        </div>
        <ul className="divide-y divide-line" aria-label="File record list">
          {records.map((file) => (
            <li key={file.id}>
              <Link className="block p-4 hover:bg-slate-50 focus-visible:bg-slate-50" href={`/files/${file.id}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-ink">{file.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {file.versionCount} version{file.versionCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <FileVisibilityBadge visibility={file.visibility} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
