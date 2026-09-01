/**
 * Phase 4 - Invoicing, payments, revenue and profitability.
 * Run: node --test test/phase-4-invoicing.test.mjs
 *
 * Behavioural tests cover the money arithmetic (invoice-totals.ts,
 * profitability.ts), which import nothing locally and so load directly under
 * Node's TypeScript type stripping. Everything that reaches Prisma or Nest is
 * asserted against its source, as in the Phase 2 and Phase 3 suites.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(join(apiRoot, rel), 'utf8');
const exists = (rel) => existsSync(join(apiRoot, rel));
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const totals = await import('../src/modules/invoices/invoice-totals.ts');
const profit = await import('../src/modules/finance/profitability.ts');

// ── Line and invoice arithmetic ───────────────────────────────────────────────

describe('Phase 4 - invoice arithmetic', () => {
  it('multiplies quantity by unit price in integer cents', () => {
    assert.equal(totals.computeLineTotal(3, 1050), 3150);
    assert.equal(totals.computeLineTotal(1, 0), 0);
  });

  it('rejects amounts that are not safe non-negative integers', () => {
    assert.throws(() => totals.computeLineTotal(1.5, 100), totals.InvoiceAmountError);
    assert.throws(() => totals.computeLineTotal(1, 10.5), totals.InvoiceAmountError);
    assert.throws(() => totals.computeLineTotal(-1, 100), totals.InvoiceAmountError);
    assert.throws(() => totals.computeLineTotal(0, 100), totals.InvoiceAmountError);
    assert.throws(() => totals.computeLineTotal(1, -100), totals.InvoiceAmountError);
  });

  it('rejects amounts beyond the overflow guard', () => {
    assert.throws(
      () => totals.computeLineTotal(2, totals.MAX_AMOUNT_CENTS),
      totals.InvoiceAmountError,
    );
    assert.throws(
      () => totals.computeLineTotal(totals.MAX_LINE_QUANTITY + 1, 1),
      totals.InvoiceAmountError,
    );
  });

  it('sums line totals into the invoice subtotal', () => {
    const result = totals.computeInvoiceTotals([
      { description: 'a', quantity: 2, unitAmountCents: 75000 },
      { description: 'b', quantity: 1, unitAmountCents: 100000 },
    ]);

    assert.equal(result.subtotalCents, 250000);
    assert.equal(result.totalCents, 250000);
    assert.equal(result.lines[0].totalAmountCents, 150000);
    assert.equal(result.lines[1].totalAmountCents, 100000);
  });

  it('handles an invoice with no lines', () => {
    const result = totals.computeInvoiceTotals([]);
    assert.equal(result.subtotalCents, 0);
    assert.equal(result.totalCents, 0);
    assert.deepEqual(result.lines, []);
  });
});

// ── Status derivation ─────────────────────────────────────────────────────────

describe('Phase 4 - invoice status derivation', () => {
  const past = new Date('2026-01-01');
  const now = new Date('2026-06-01');

  it('marks an invoice PAID when settled in full', () => {
    assert.equal(
      totals.resolveInvoiceStatus({ currentStatus: 'SENT', totalCents: 1000, paidCents: 1000, now }),
      'PAID',
    );
    assert.equal(
      totals.resolveInvoiceStatus({ currentStatus: 'OVERDUE', totalCents: 1000, paidCents: 1200, dueAt: past, now }),
      'PAID',
    );
  });

  it('marks a partial payment PARTIALLY_PAID even when overdue', () => {
    assert.equal(
      totals.resolveInvoiceStatus({ currentStatus: 'SENT', totalCents: 1000, paidCents: 400, dueAt: past, now }),
      'PARTIALLY_PAID',
    );
  });

  it('marks an unpaid issued invoice OVERDUE past its due date', () => {
    assert.equal(
      totals.resolveInvoiceStatus({ currentStatus: 'SENT', totalCents: 1000, paidCents: 0, dueAt: past, now }),
      'OVERDUE',
    );
  });

  it('never makes a DRAFT overdue', () => {
    assert.equal(
      totals.resolveInvoiceStatus({ currentStatus: 'DRAFT', totalCents: 1000, paidCents: 0, dueAt: past, now }),
      'DRAFT',
    );
  });

  it('treats VOID as terminal', () => {
    assert.equal(
      totals.resolveInvoiceStatus({ currentStatus: 'VOID', totalCents: 1000, paidCents: 1000, now }),
      'VOID',
    );
  });

  it('does not call a zero-total invoice paid', () => {
    assert.equal(
      totals.resolveInvoiceStatus({ currentStatus: 'SENT', totalCents: 0, paidCents: 0, now }),
      'SENT',
    );
    assert.equal(totals.isFullyPaid(0, 0), false);
    assert.equal(totals.isFullyPaid(1000, 1000), true);
  });
});

// ── Money formatting ──────────────────────────────────────────────────────────

describe('Phase 4 - money formatting', () => {
  it('renders cents with exactly two decimals', () => {
    assert.equal(totals.formatCents(0), '0.00');
    assert.equal(totals.formatCents(5), '0.05');
    assert.equal(totals.formatCents(50), '0.50');
    assert.equal(totals.formatCents(250000), '2500.00');
  });

  it('renders negative balances correctly', () => {
    assert.equal(totals.formatCents(-1500), '-15.00');
    assert.equal(totals.formatCents(-5), '-0.05');
  });

  it('normalises the currency code and falls back to EUR', () => {
    assert.equal(totals.formatMoney(100, 'eur'), '1.00 EUR');
    assert.equal(totals.formatMoney(100, ''), '1.00 EUR');
    assert.equal(totals.formatMoney(100, 'usd'), '1.00 USD');
  });

  it('refuses to format a non-integer amount', () => {
    assert.throws(() => totals.formatCents(10.5), totals.InvoiceAmountError);
  });
});

// ── Profitability ─────────────────────────────────────────────────────────────

describe('Phase 4 - profitability', () => {
  it('computes margin in cents and percent', () => {
    const result = profit.computeProfitability({ revenueCents: 100000, costCents: 25000 });
    assert.equal(result.marginCents, 75000);
    assert.equal(result.marginPercent, 75);
  });

  it('reports a negative margin rather than clamping to zero', () => {
    const result = profit.computeProfitability({ revenueCents: 10000, costCents: 15000 });
    assert.equal(result.marginCents, -5000);
    assert.equal(result.marginPercent, -50);
  });

  it('returns null percent when there is no revenue', () => {
    const result = profit.computeProfitability({ revenueCents: 0, costCents: 5000 });
    assert.equal(result.marginCents, -5000);
    assert.equal(result.marginPercent, null);
  });

  it('keeps a cost-only project visible and sorts the worst margin first', () => {
    const revenue = new Map([['p1', { name: 'Alpha', cents: 100000 }]]);
    const cost = new Map([
      ['p1', { name: 'Alpha', cents: 20000 }],
      ['p2', { name: 'Beta', cents: 30000 }],
    ]);

    const rows = profit.buildProjectProfitability(revenue, cost);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].projectId, 'p2');
    assert.equal(rows[0].marginCents, -30000);
    assert.equal(rows[0].marginPercent, null);
    assert.equal(rows[1].projectId, 'p1');
    assert.equal(rows[1].marginCents, 80000);
  });
});

// ── PDF rendering (source contract) ───────────────────────────────────────────

describe('Phase 4 - invoice PDF', () => {
  const src = read('src/modules/invoices/invoice-pdf.service.ts');

  it('exists and renders in memory', () => {
    assert.ok(exists('src/modules/invoices/invoice-pdf.service.ts'));
    assert.match(src, /Promise<Buffer>/);
    assert.match(src, /Buffer\.concat\(chunks\)/);
    // No temp file: nothing is written to local disk.
    assert.doesNotMatch(src, /writeFileSync|createWriteStream/);
  });

  it('uses the import form that survives CommonJS emit without esModuleInterop', () => {
    assert.match(src, /import PDFDocument = require\('pdfkit'\)/);
  });

  it('formats every amount through the shared integer formatter', () => {
    assert.match(src, /formatMoney/);
    assert.doesNotMatch(stripComments(src), /toFixed/);
  });
});

// ── Invoice lifecycle (source contract) ───────────────────────────────────────

describe('Phase 4 - invoice lifecycle', () => {
  const service = read('src/modules/invoices/invoices.service.ts');
  const repository = read('src/modules/invoices/invoices.repository.ts');
  const controller = read('src/modules/invoices/invoices.controller.ts');

  it('exposes the PDF and send routes', () => {
    assert.match(controller, /@Get\(':id\/pdf'\)/);
    assert.match(controller, /@Post\(':id\/send'\)/);
  });

  it('validates the request body with real DTO classes', () => {
    assert.match(controller, /CreateInvoiceDto/);
    assert.match(controller, /UpdateInvoiceStatusDto/);
    assert.match(controller, /SendInvoiceDto/);
    // The old code imported an interface from the repository, which
    // class-validator cannot see, so nothing was validated.
    assert.doesNotMatch(controller, /from '\.\/invoices\.repository'/);
  });

  it('computes totals from the lines instead of trusting the caller', () => {
    assert.match(repository, /computeInvoiceTotals/);
    const createBlock = repository.slice(
      repository.indexOf('create(tenantId: string'),
      repository.indexOf('getById(tenantId: string'),
    );
    assert.ok(createBlock.length > 0);
    assert.doesNotMatch(createBlock, /dto\.totalCents|dto\.subtotalCents/);
  });

  it('sends the email before marking the invoice SENT', () => {
    const sendAt = service.indexOf('mail.sendDocument(');
    const markAt = service.indexOf('repo.markSent(');
    assert.ok(sendAt > -1 && markAt > -1 && sendAt < markAt);
  });

  it('reports an unconfigured mailer instead of silently succeeding', () => {
    assert.match(service, /MAIL_NOT_CONFIGURED/);
    assert.match(service, /MAIL_SEND_FAILED/);
  });

  it('stamps issuedAt only once so a re-send keeps the original date', () => {
    assert.match(repository, /current\?\.issuedAt \?\? issuedAt/);
  });

  it('derives paidCents from the recorded payments', () => {
    assert.match(repository, /recalculatePaid/);
    assert.match(repository, /payment\.aggregate/);
    assert.match(repository, /resolveInvoiceStatus/);
    assert.match(repository, /notIn: \['FAILED', 'REFUNDED', 'CANCELED'\]/);
  });

  it('posts invoice revenue at most once', () => {
    assert.match(repository, /postRevenueOnce/);
    assert.match(repository, /revenueRecord\.findFirst/);
    assert.match(service, /revenue\.created/);
  });

  it('scopes every invoice query by tenant', () => {
    const queries = repository.match(/where: \{[^}]*tenantId[^}]*\}/g) ?? [];
    assert.ok(queries.length >= 6);
    assert.doesNotMatch(repository, /findMany\(\{\s*orderBy/);
  });
});

// ── Client portal exposure ────────────────────────────────────────────────────

describe('Phase 4 - client portal exposure', () => {
  const clientInvoices = read('src/modules/invoices/client-invoices.controller.ts');
  const clientPayments = read('src/modules/payments/client-payments.controller.ts');
  const invoiceRepo = read('src/modules/invoices/invoices.repository.ts');
  const paymentRepo = read('src/modules/payments/payments.repository.ts');

  it('never serves the internal listing to a client', () => {
    assert.match(clientInvoices, /listForClient/);
    assert.match(clientInvoices, /getForClient/);
    assert.doesNotMatch(stripComments(clientInvoices), /invoicesService\.list\(/);
    assert.match(clientPayments, /listForClient/);
    assert.doesNotMatch(stripComments(clientPayments), /paymentsService\.list\(/);
  });

  it('filters client invoices to visible, non-draft rows', () => {
    assert.match(invoiceRepo, /clientVisible: true/);
    assert.match(invoiceRepo, /status: \{ not: InvoiceStatus\.DRAFT \}/);
  });

  it('filters client payments through their invoice', () => {
    assert.match(paymentRepo, /invoice: \{ is: \{ clientVisible: true/);
  });

  it('registers both client controllers so the routes actually exist', () => {
    const invoicesModule = read('src/modules/invoices/invoices.module.ts');
    const paymentsModule = read('src/modules/payments/payments.module.ts');
    assert.match(invoicesModule, /controllers: \[InvoicesController, ClientInvoicesController\]/);
    assert.match(paymentsModule, /controllers: \[PaymentsController, ClientPaymentsController\]/);
  });

  it('hides an unsent invoice from the client PDF route', () => {
    const service = read('src/modules/invoices/invoices.service.ts');
    assert.match(service, /forClient/);
    assert.match(service, /!invoice\.clientVisible \|\| invoice\.status === InvoiceStatus\.DRAFT/);
  });
});

// ── Manual payments ───────────────────────────────────────────────────────────

describe('Phase 4 - manual payments', () => {
  const service = read('src/modules/payments/payments.service.ts');
  const controller = read('src/modules/payments/payments.controller.ts');
  const repository = read('src/modules/payments/payments.repository.ts');

  it('validates the body with the payment DTO', () => {
    assert.match(controller, /CreatePaymentDto/);
    assert.doesNotMatch(controller, /amountCents: number;/);
  });

  it('confirms the invoice belongs to the tenant before attaching a payment', () => {
    assert.match(service, /findInvoiceForTenant/);
    const lookupAt = service.indexOf('findInvoiceForTenant');
    const createAt = service.indexOf('repo.create(');
    assert.ok(lookupAt > -1 && createAt > -1 && lookupAt < createAt);
  });

  it('rejects a non-positive amount', () => {
    assert.match(service, /INVALID_PAYMENT_AMOUNT/);
  });

  it('re-synchronises the invoice after recording a payment', () => {
    assert.match(service, /invoices\.syncAfterPayment/);
  });

  it('defaults a manual payment to RECORDED and received now', () => {
    assert.match(repository, /PaymentStatus\.RECORDED/);
    assert.match(repository, /PaymentMethod\.MANUAL/);
    assert.match(repository, /receivedAt: dto\.receivedAt \? new Date\(dto\.receivedAt\) : new Date\(\)/);
  });
});

// ── Finance reporting ─────────────────────────────────────────────────────────

describe('Phase 4 - finance reporting', () => {
  it('exposes a profitability endpoint', () => {
    const controller = read('src/modules/finance/finance.controller.ts');
    assert.match(controller, /@Get\('profitability'\)/);
    assert.match(controller, /sensitive: true/);
  });

  it('derives summary margin from the same helper as the report', () => {
    const repository = read('src/modules/finance/finance.repository.ts');
    assert.match(repository, /computeProfitability/);
    assert.match(repository, /buildProjectProfitability/);
    assert.match(repository, /groupBy/);
  });

  it('scopes profitability queries by tenant', () => {
    const repository = read('src/modules/finance/finance.repository.ts');
    const groupBys = repository.match(/groupBy\(\{[\s\S]*?\}\)/g) ?? [];
    assert.ok(groupBys.length >= 2);
    for (const block of groupBys) {
      assert.match(block, /tenantId/);
    }
  });
});

// ── Mail ──────────────────────────────────────────────────────────────────────

describe('Phase 4 - mail', () => {
  const src = read('src/modules/mail/mail.service.ts');

  it('supports an awaitable send with an attachment', () => {
    assert.match(src, /async sendDocument/);
    assert.match(src, /attachments:/);
    assert.match(src, /Promise<boolean>/);
  });

  it('does not log recipient addresses', () => {
    assert.doesNotMatch(src, /document_email_sent[^`]*\$\{recipients\.join/);
  });

  it('keeps the original fire-and-forget notification path intact', () => {
    assert.match(src, /private send\(to: string, subject: string, text: string\): void/);
  });
});
