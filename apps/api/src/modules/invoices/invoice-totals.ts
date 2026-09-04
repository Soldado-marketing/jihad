/**
 * Phase 4 - Invoice arithmetic and status derivation.
 *
 * All money is integer cents. No floating point is used anywhere in this file:
 * a rounding error here becomes a wrong invoice, so the type system is doing
 * the work instead.
 *
 * Pure functions, no I/O - unit-testable directly.
 */

export class InvoiceAmountError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvoiceAmountError';
  }
}

/** Guards against overflow and nonsense before anything is persisted. */
export const MAX_AMOUNT_CENTS = 1_000_000_000_00; // 1 billion units
export const MAX_LINE_QUANTITY = 1_000_000;

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitAmountCents: number;
}

export interface InvoiceLineTotal extends InvoiceLineInput {
  totalAmountCents: number;
}

export interface InvoiceTotals {
  lines: InvoiceLineTotal[];
  subtotalCents: number;
  totalCents: number;
}

function assertSafeInteger(value: number, label: string, max: number): void {
  if (!Number.isInteger(value)) {
    throw new InvoiceAmountError(`${label} must be an integer.`);
  }
  if (value < 0) {
    throw new InvoiceAmountError(`${label} must not be negative.`);
  }
  if (value > max) {
    throw new InvoiceAmountError(`${label} exceeds the maximum of ${max}.`);
  }
}

/** Line total = quantity x unit price, in cents. */
export function computeLineTotal(quantity: number, unitAmountCents: number): number {
  assertSafeInteger(quantity, 'quantity', MAX_LINE_QUANTITY);
  assertSafeInteger(unitAmountCents, 'unitAmountCents', MAX_AMOUNT_CENTS);

  if (quantity < 1) {
    throw new InvoiceAmountError('quantity must be at least 1.');
  }

  const total = quantity * unitAmountCents;
  if (total > MAX_AMOUNT_CENTS) {
    throw new InvoiceAmountError(`Line total exceeds the maximum of ${MAX_AMOUNT_CENTS}.`);
  }
  return total;
}

/**
 * Computes per-line and invoice-level totals.
 *
 * subtotal and total are equal for now: tax is not modelled in the schema, and
 * inventing a tax field here would be a silent business rule. They are kept as
 * separate values so tax can be introduced later without a data migration.
 */
export function computeInvoiceTotals(lines: InvoiceLineInput[]): InvoiceTotals {
  if (!Array.isArray(lines)) {
    throw new InvoiceAmountError('lines must be an array.');
  }

  const withTotals = lines.map((line) => ({
    ...line,
    totalAmountCents: computeLineTotal(line.quantity, line.unitAmountCents),
  }));

  const subtotalCents = withTotals.reduce((sum, line) => sum + line.totalAmountCents, 0);
  if (subtotalCents > MAX_AMOUNT_CENTS) {
    throw new InvoiceAmountError(`Invoice total exceeds the maximum of ${MAX_AMOUNT_CENTS}.`);
  }

  return { lines: withTotals, subtotalCents, totalCents: subtotalCents };
}

export type InvoiceStatusName =
  | 'DRAFT'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

export interface ResolveStatusInput {
  currentStatus: InvoiceStatusName;
  totalCents: number;
  paidCents: number;
  dueAt?: Date | null;
  now?: Date;
}

/**
 * Derives the invoice status from what has actually been paid.
 *
 * Rules, in order:
 *  - VOID is terminal: a voided invoice is never revived by a payment.
 *  - Paid in full (and non-zero) wins over everything else.
 *  - A partial payment always shows as PARTIALLY_PAID, even when overdue,
 *    because "some money arrived" is the more useful signal to act on.
 *  - An unpaid invoice that has been issued and is past its due date is OVERDUE.
 *  - Otherwise the current status stands.
 */
export function resolveInvoiceStatus(input: ResolveStatusInput): InvoiceStatusName {
  const { currentStatus, totalCents, paidCents, dueAt } = input;
  const now = input.now ?? new Date();

  if (currentStatus === 'VOID') return 'VOID';

  if (totalCents > 0 && paidCents >= totalCents) return 'PAID';
  if (paidCents > 0) return 'PARTIALLY_PAID';

  const isIssued = currentStatus !== 'DRAFT';
  if (isIssued && dueAt instanceof Date && dueAt.getTime() < now.getTime()) {
    return 'OVERDUE';
  }

  return currentStatus;
}

/** True when the invoice has been settled in full. */
export function isFullyPaid(totalCents: number, paidCents: number): boolean {
  return totalCents > 0 && paidCents >= totalCents;
}

/**
 * Renders integer cents as a fixed two-decimal string.
 * Built by integer division so no float ever touches a printed amount.
 */
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new InvoiceAmountError('cents must be an integer.');
  }

  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const units = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const body = `${units}.${String(remainder).padStart(2, '0')}`;

  return negative ? `-${body}` : body;
}

/** Renders an amount with its currency code, e.g. "1234.50 EUR". */
export function formatMoney(cents: number, currency: string): string {
  const code = (currency ?? '').trim().toUpperCase().slice(0, 3) || 'EUR';
  return `${formatCents(cents)} ${code}`;
}
