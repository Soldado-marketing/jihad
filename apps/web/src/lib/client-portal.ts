/** Shared formatting for the client portal. */
import { formatCents } from '@/lib/money';

export type Delivery = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  versionNumber: number | null;
  kind?: 'image' | 'pdf' | 'video' | 'link' | 'document';
  project: { id: string; name: string } | null;
};

export type Appointment = {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  preparation: string;
  status: 'SCHEDULED' | 'CANCELLED';
  project: { id: string; name: string } | null;
  seenAt: string | null;
  seenCurrent: boolean;
};

export type ClientInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  totalCents: number;
  paidCents: number;
  dueAt: string | null;
  issuedAt: string | null;
  project?: { id: string; name: string } | null;
};

export type ClientProblem = {
  id: string;
  subject: string;
  status: 'OPEN' | 'ANSWERED' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  delivery: { id: string; title: string } | null;
  messages: { id: string; from: 'you' | 'company'; body: string; at: string }[];
};

export const PROBLEM_STATUS_LABEL: Record<string, string> = { OPEN: 'Sent to management', ANSWERED: 'Answered', RESOLVED: 'Resolved' };

export const KIND_LABEL: Record<string, string> = { image: 'Image', pdf: 'PDF', video: 'Video', link: 'Link', document: 'Document' };

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  SENT: 'Open', PARTIALLY_PAID: 'Partly paid', PAID: 'Paid', OVERDUE: 'Overdue', VOID: 'Cancelled',
};

/** Payments the agency has confirmed; pending or failed ones do not reduce the balance. */
/** Same rule as the API's paid total (invoice-totals.ts UNCOUNTED_PAYMENT_STATUSES). */
const UNCOUNTED_PAYMENT = new Set(['FAILED', 'REFUNDED', 'CANCELED']);
export const countedPayment = (status: string) => !UNCOUNTED_PAYMENT.has(status);

/** Integer cents in the invoice's own currency, never through floats. */
export function money(cents: number, currency: string): string {
  return formatCents(cents, currency);
}

export function remainingCents(i: Pick<ClientInvoice, 'totalCents' | 'paidCents'>): number {
  return Math.max(0, i.totalCents - i.paidCents);
}

export function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
