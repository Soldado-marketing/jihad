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

/** Importable columns per type; * = required. E-mail columns: OWNER only; budgetCents: OWNER only. */
export const IMPORT_COLUMNS: Record<TransferType, string> = {
  customers: 'name*, clientScopeKey*, status (ACTIVE|INACTIVE), industry, website, notes, responsibleEmail',
  projects: 'name*, projectNumber, status (ACTIVE|PAUSED|ARCHIVED), customerKey, serviceType, deadline (YYYY-MM-DD), description, ownerEmail, budgetCents (whole cents)',
  tasks: 'title*, projectNumber, status, priority (LOW|MEDIUM|HIGH|URGENT), dueDate (YYYY-MM-DD), description, assigneeEmail',
};

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

export function reportSummary(r: ImportReport): string {
  if (r.committed) return `Imported ${r.created} ${r.created === 1 ? 'row' : 'rows'}.`;
  if (r.valid) return `${r.rows} ${r.rows === 1 ? 'row' : 'rows'} checked, no problems. Nothing has been written yet.`;
  const n = r.errorCount ?? r.errors.length;
  return `${n} ${n === 1 ? 'problem' : 'problems'} found. Nothing was imported; fix the file and check again.`;
}
