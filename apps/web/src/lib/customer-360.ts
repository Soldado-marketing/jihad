/**
 * Customer 360 page helpers (MAOS-T55) over GET /customers/:id/overview (T54).
 *
 * The API decides what the caller sees: a section the caller may not read is
 * absent from the response, and money (budgets, amounts, totals, payments)
 * arrives only for the OWNER. These helpers never invent a section or a
 * number the API did not send.
 */
import type { CustomerRow } from './customers';

/** As the projects API derives it (T57): archived tasks excluded, null without tasks. */
export interface Progress {
  done: number;
  total: number;
  percent: number | null;
}

export type OverviewSection = 'projects' | 'tasks' | 'files' | 'approvals' | 'invoices' | 'finance';
type Counts = Record<string, number>;

export interface CustomerOverview {
  customer: CustomerRow;
  sections: OverviewSection[];
  projects?: {
    total: number;
    items: {
      id: string;
      name: string;
      status: string;
      projectNumber: string | null;
      serviceType: string | null;
      deadline: string | null;
      budgetCents?: number | null;
      owner: { id: string; displayName: string | null } | null;
      progress: Progress;
    }[];
  };
  tasks?: { byStatus: Counts; upcoming: { id: string; title: string; status: string; dueAt: string; projectId: string | null; assignedTo: { id: string; displayName: string | null } | null }[] };
  files?: { total: number; recent: { id: string; name: string; mimeType: string | null; sizeBytes: number | null; projectId: string | null; createdAt: string }[] };
  approvals?: { byStatus: Counts; open: { id: string; title: string; status: string; dueAt: string | null; fileAssetId: string | null }[] };
  invoices?: { byStatus: Counts; recent: { id: string; invoiceNumber: string; status: string; issuedAt: string | null; dueAt: string | null; projectId: string | null }[] };
  finance?: {
    totals: { currency: string; invoicedCents: number; paidCents: number; outstandingCents: number }[];
    recentPayments: { id: string; invoiceId: string | null; amountCents: number; currency: string; status: string; method: string; receivedAt: string | null }[];
  };
}

export type Tab = 'overview' | 'projects' | 'files' | 'notes';

/** Overview and Notes always; Projects and Files only when the API sent them. */
export function tabsFor(o: Pick<CustomerOverview, 'sections'>): Tab[] {
  return [
    'overview',
    ...(o.sections.includes('projects') ? (['projects'] as const) : []),
    ...(o.sections.includes('files') ? (['files'] as const) : []),
    'notes',
  ];
}

const CLOSED_TASK = ['DONE', 'ARCHIVED'];
const OPEN_APPROVAL = ['REQUESTED', 'CHANGES_REQUESTED'];
const OPEN_INVOICE = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'];

const sum = (counts: Counts, keep: (status: string) => boolean) =>
  Object.entries(counts).reduce((n, [status, c]) => (keep(status) ? n + c : n), 0);

export interface Kpi {
  key: string;
  label: string;
  value: number;
}

/** Counts for the KPI row, one per section the caller may read. Money is shown separately (OWNER only). */
export function kpis(o: CustomerOverview): Kpi[] {
  const out: Kpi[] = [];
  if (o.projects) out.push({ key: 'projects', label: 'Projects', value: o.projects.total });
  if (o.tasks) out.push({ key: 'openTasks', label: 'Open tasks', value: sum(o.tasks.byStatus, (s) => !CLOSED_TASK.includes(s)) });
  if (o.approvals) out.push({ key: 'openApprovals', label: 'Open approvals', value: sum(o.approvals.byStatus, (s) => OPEN_APPROVAL.includes(s)) });
  if (o.files) out.push({ key: 'files', label: 'Files', value: o.files.total });
  if (o.invoices) out.push({ key: 'openInvoices', label: 'Open invoices', value: sum(o.invoices.byStatus, (s) => OPEN_INVOICE.includes(s)) });
  return out;
}

export function progressText(p: Progress): string {
  return p.percent === null ? 'No tasks' : `${p.percent}% · ${p.done}/${p.total}`;
}

export function fileSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(Math.round((bytes / (1024 * 1024)) * 10) / 10).toFixed(1)} MB`;
}
