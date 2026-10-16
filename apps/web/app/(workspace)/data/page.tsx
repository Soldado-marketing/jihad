'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { getStoredUser } from '@/lib/auth';
import {
  canExport,
  canImport,
  IMPORT_COLUMNS,
  MAX_ROWS,
  reportSummary,
  tooLarge,
  TRANSFER_TYPES,
  TYPE_LABEL,
  type ImportReport,
  type TransferType,
} from '@/lib/data-transfer';
import { apiBlob, apiFetch, saveBlob } from '@/lib/fetch';

/**
 * CSV import/export (MAOS-T118). Export downloads what the caller may read;
 * import checks the whole file first and writes it only when every row is
 * valid, in one step. Create-only: existing records are never changed.
 */
export default function DataTransferPage() {
  const [role, setRole] = useState<string | undefined>();
  useEffect(() => setRole(getStoredUser()?.role), []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data"
        title="Import & export"
        description="CSV for customers, projects and tasks. Exports contain only what you may see; imports add new records and never change existing ones."
      />
      {TRANSFER_TYPES.filter((t) => canExport(role, t) || canImport(role, t)).map((t) => (
        <TransferCard key={t} type={t} role={role} />
      ))}
    </div>
  );
}

function TransferCard({ type, role }: { type: TransferType; role?: string }) {
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function download() {
    setError('');
    try {
      const { blob, filename } = await apiBlob(`/data/export/${type}`, `maos-${type}.csv`);
      saveBlob(blob, filename);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'The export failed.');
    }
  }

  async function pick(file: File | undefined) {
    setReport(null);
    setError('');
    setCsv('');
    setFileName(file?.name ?? '');
    if (!file) return;
    const text = await file.text();
    const big = tooLarge(text);
    if (big) setError(big);
    else setCsv(text);
  }

  async function send(commit: boolean) {
    setBusy(true);
    setError('');
    try {
      setReport(await apiFetch<ImportReport>(`/data/import/${type}`, { method: 'POST', body: JSON.stringify({ csv, commit }) }));
      if (commit) setCsv('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'The import failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-line bg-white p-5" aria-label={TYPE_LABEL[type]}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{TYPE_LABEL[type]}</h2>
        {canExport(role, type) && (
          <button onClick={download} className="rounded-lg border border-line px-4 py-2 text-sm font-medium">Export CSV</button>
        )}
      </div>
      {canImport(role, type) && (
        <div className="space-y-3">
          <p className="text-xs text-muted">Columns: {IMPORT_COLUMNS[type]}. Up to {MAX_ROWS} rows. An export file can be imported as is; its read-only columns are ignored.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium">
              Choose CSV…
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
            </label>
            {fileName && <span className="text-sm text-muted">{fileName}</span>}
            <button disabled={!csv || busy} onClick={() => void send(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium disabled:opacity-50">
              Check file
            </button>
            <button
              disabled={!csv || busy || !report?.valid || report.committed}
              onClick={() => void send(true)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Import {report?.valid && !report.committed ? `${report.rows} rows` : ''}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {report && (
        <div role="status" className="space-y-2">
          <p className={`text-sm ${report.valid ? 'text-ink' : 'text-danger'}`}>{reportSummary(report)}</p>
          {report.errors.length > 0 && (
            <table className="w-full text-left text-xs">
              <thead className="text-muted"><tr><th className="py-1 pe-3">Line</th><th className="py-1 pe-3">Column</th><th className="py-1">Problem</th></tr></thead>
              <tbody className="divide-y divide-line">
                {report.errors.map((e, i) => (
                  <tr key={`${e.line}-${e.column}-${i}`}><td className="py-1 pe-3 tabular-nums">{e.line}</td><td className="py-1 pe-3"><code>{e.column ?? '—'}</code></td><td className="py-1">{e.message}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
