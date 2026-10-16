/**
 * CSV import/export page helpers (MAOS-T118). The API decides every right
 * (read to export, create to import, which columns a role may see or send);
 * these only describe the file formats and avoid offering refused actions.
 */

export type TransferType = 'customers' | 'projects' | 'tasks';
export const TRANSFER_TYPES: readonly TransferType[] = ['customers', 'projects', 'tasks'];

export const TYPE_LABEL: Record<TransferType, string> = { customers: 'Customers', projects: 'Projects', tasks: 'Tasks' };

/** Same limit as the API (MAX_CSV_CHARS): checked here so a too-large file is refused before upload. */
export const MAX_CSV_CHARS = 96_000;
export const MAX_ROWS = 500;

/** Importable columns per type, as the API reads them. `owner`: the API accepts it from the OWNER only. */
interface ImportColumn {
  name: string;
  hint?: string;
  required?: boolean;
  owner?: boolean;
}
export const IMPORT_COLUMNS: Record<TransferType, ImportColumn[]> = {
  customers: [
    { name: 'name', required: true }, { name: 'clientScopeKey', required: true }, { name: 'status', hint: 'ACTIVE|INACTIVE' },
    { name: 'industry' }, { name: 'website' }, { name: 'notes' }, { name: 'responsibleEmail', owner: true },
  ],
  projects: [
    { name: 'name', required: true }, { name: 'projectNumber' }, { name: 'status', hint: 'ACTIVE|PAUSED|ARCHIVED' }, { name: 'customerKey' },
    { name: 'serviceType' }, { name: 'deadline', hint: 'YYYY-MM-DD' }, { name: 'description' }, { name: 'ownerEmail', owner: true },
    { name: 'budgetCents', hint: 'whole cents', owner: true },
  ],
  tasks: [
    { name: 'title', required: true }, { name: 'projectNumber' }, { name: 'status' }, { name: 'priority', hint: 'LOW|MEDIUM|HIGH|URGENT' },
    { name: 'dueDate', hint: 'YYYY-MM-DD' }, { name: 'description' }, { name: 'assigneeEmail', owner: true },
  ],
};

/** The columns this role may send, e.g. "name*, status (ACTIVE|INACTIVE)"; owner-only columns only for the OWNER. */
export function columnsHint(type: TransferType, role: string | undefined): string {
  return IMPORT_COLUMNS[type]
    .filter((c) => !c.owner || role === 'OWNER')
    .map((c) => `${c.name}${c.required ? '*' : ''}${c.hint ? ` (${c.hint})` : ''}`)
    .join(', ');
}

/** Default role rights (the API has the final word, including custom grants). */
export function canExport(role: string | undefined, type: TransferType): boolean {
  if (!role || role === 'CLIENT') return false;
  return type === 'customers' ? role !== 'CONTRACTOR' : true;
}
export function canImport(role: string | undefined, type: TransferType): boolean {
  if (role === 'OWNER' || role === 'MANAGER') return true;
  return type === 'tasks' && (role === 'EMPLOYEE' || role === 'CONTRACTOR');
}

export interface ImportError {
  line: number;
  column?: string;
  code: string;
  message: string;
}
export interface ImportReport {
  type: TransferType;
  rows: number;
  valid: boolean;
  committed: boolean;
  created: number;
  errors: ImportError[];
  errorCount?: number;
}

export function tooLarge(text: string): string | null {
  return text.length > MAX_CSV_CHARS ? `The file is too large (at most ${MAX_CSV_CHARS.toLocaleString('en')} characters).` : null;
}

const rows = (n: number) => `${n} ${n === 1 ? 'row' : 'rows'}`;

/** Label of the import button: the row count only once a file has been checked and is valid. */
export function importLabel(r: ImportReport | null): string {
  return r?.valid && !r.committed ? `Import ${rows(r.rows)}` : 'Import';
}

export function reportSummary(r: ImportReport): string {
  if (r.committed) return `Imported ${rows(r.created)}.`;
  if (r.valid) return `${rows(r.rows)} checked, no problems. Nothing has been written yet.`;
  const n = r.errorCount ?? r.errors.length;
  return `${n} ${n === 1 ? 'problem' : 'problems'} found. Nothing was imported; fix the file and check again.`;
}
