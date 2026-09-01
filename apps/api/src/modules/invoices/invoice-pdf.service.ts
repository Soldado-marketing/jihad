/**
 * Phase 4 - Invoice PDF rendering.
 *
 * Produces the document in memory and returns a Buffer. Nothing is written to
 * local disk: the PDF is either streamed to the caller or attached to an email,
 * so a temp file would only add a cleanup problem and a data-at-rest concern.
 *
 * Note the import form. This project compiles to CommonJS WITHOUT
 * esModuleInterop, so `import PDFDocument from 'pdfkit'` would typecheck and
 * then be undefined at runtime. `import ... = require(...)` is the form that
 * emits a plain require and actually works.
 */

import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { formatMoney } from './invoice-totals';

export interface InvoicePdfLine {
  description: string;
  quantity: number;
  unitAmountCents: number;
  totalAmountCents: number;
}

export interface InvoicePdfInput {
  invoiceNumber: string;
  status: string;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  paidCents: number;
  issuedAt?: Date | null;
  dueAt?: Date | null;
  projectName?: string | null;
  tenantName?: string | null;
  lines: InvoicePdfLine[];
}

/** Keeps a hostile or accidental mega-string from breaking the layout. */
function clamp(value: string | null | undefined, max: number): string {
  if (typeof value !== 'string') return '';
  const collapsed = value.replace(/\s+/g, ' ').trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

function formatDate(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '-';
  return value.toISOString().slice(0, 10);
}

const PAGE_MARGIN = 50;
const COLUMN = { description: 50, quantity: 320, unit: 380, total: 470 };

@Injectable()
export class InvoicePdfService {
  /** Renders the invoice and resolves with the complete PDF bytes. */
  render(invoice: InvoicePdfInput): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        this.compose(doc, invoice);
        doc.end();
      } catch (error) {
        reject(error as Error);
      }
    });
  }

  private compose(doc: PDFKit.PDFDocument, invoice: InvoicePdfInput): void {
    const currency = invoice.currency;

    // ── Header ────────────────────────────────────────────────────────────
    doc.fontSize(20).text(clamp(invoice.tenantName, 60) || 'Invoice', PAGE_MARGIN, PAGE_MARGIN);
    doc.fontSize(10).fillColor('#555555');
    doc.text('INVOICE', { align: 'right' });
    doc.fillColor('#000000');
    doc.moveDown(1.5);

    // ── Meta ──────────────────────────────────────────────────────────────
    doc.fontSize(11);
    doc.text(`Invoice number: ${clamp(invoice.invoiceNumber, 80)}`);
    doc.text(`Status: ${clamp(invoice.status, 30)}`);
    doc.text(`Issued: ${formatDate(invoice.issuedAt)}`);
    doc.text(`Due: ${formatDate(invoice.dueAt)}`);
    if (invoice.projectName) {
      doc.text(`Project: ${clamp(invoice.projectName, 80)}`);
    }
    doc.moveDown(1);

    // ── Line table ────────────────────────────────────────────────────────
    const tableTop = doc.y;
    doc.fontSize(10).fillColor('#555555');
    doc.text('Description', COLUMN.description, tableTop);
    doc.text('Qty', COLUMN.quantity, tableTop, { width: 40, align: 'right' });
    doc.text('Unit', COLUMN.unit, tableTop, { width: 80, align: 'right' });
    doc.text('Amount', COLUMN.total, tableTop, { width: 80, align: 'right' });
    doc.fillColor('#000000');

    doc
      .moveTo(PAGE_MARGIN, doc.y + 4)
      .lineTo(550, doc.y + 4)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.8);

    for (const line of invoice.lines) {
      const rowTop = doc.y;
      doc.fontSize(10);
      doc.text(clamp(line.description, 120), COLUMN.description, rowTop, { width: 250 });
      doc.text(String(line.quantity), COLUMN.quantity, rowTop, { width: 40, align: 'right' });
      doc.text(formatMoney(line.unitAmountCents, currency), COLUMN.unit, rowTop, {
        width: 80,
        align: 'right',
      });
      doc.text(formatMoney(line.totalAmountCents, currency), COLUMN.total, rowTop, {
        width: 80,
        align: 'right',
      });
      doc.moveDown(0.6);
    }

    if (invoice.lines.length === 0) {
      doc.fontSize(10).fillColor('#777777').text('No line items.', COLUMN.description);
      doc.fillColor('#000000');
    }

    // ── Totals ────────────────────────────────────────────────────────────
    doc.moveDown(1);
    doc
      .moveTo(320, doc.y)
      .lineTo(550, doc.y)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.6);

    const balanceDueCents = invoice.totalCents - invoice.paidCents;
    const totals: Array<[string, string]> = [
      ['Subtotal', formatMoney(invoice.subtotalCents, currency)],
      ['Total', formatMoney(invoice.totalCents, currency)],
      ['Paid', formatMoney(invoice.paidCents, currency)],
      ['Balance due', formatMoney(balanceDueCents, currency)],
    ];

    for (const [label, value] of totals) {
      const rowTop = doc.y;
      doc.fontSize(10).text(label, COLUMN.unit - 80, rowTop, { width: 140, align: 'right' });
      doc.text(value, COLUMN.total, rowTop, { width: 80, align: 'right' });
      doc.moveDown(0.5);
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#777777');
    doc.text(
      'Generated by MAOS. Amounts are shown in the invoice currency.',
      PAGE_MARGIN,
      doc.y,
      { align: 'center', width: 500 },
    );
    doc.fillColor('#000000');
  }
}
