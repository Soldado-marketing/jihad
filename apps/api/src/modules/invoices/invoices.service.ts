/**
 * Phase 4 - Invoice lifecycle: create with priced lines, render a PDF, send it
 * to the client, and keep totals and status derived from real payments.
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InvoiceStatus, MembershipRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceAmountError, formatMoney } from './invoice-totals';
import { InvoicesRepository } from './invoices.repository';

export interface InvoiceActor {
  actorId: string;
  role: string;
  sessionId?: string;
  tenantId: string;
}

export interface RenderedInvoicePdf {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly pdf: InvoicePdfService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  list(tenantId: string) { return this.repo.list(tenantId); }

  listForClient(tenantId: string) { return this.repo.listForClient(tenantId); }

  async getForClient(tenantId: string, id: string) {
    const invoice = await this.repo.getForClient(tenantId, id);
    // A draft or internal invoice is reported as absent, not forbidden, so the
    // response cannot be used to confirm that it exists.
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  create(tenantId: string, actorId: string, dto: CreateInvoiceDto) {
    try {
      return this.repo.create(tenantId, actorId, dto);
    } catch (error) {
      if (error instanceof InvoiceAmountError) {
        throw new BadRequestException({ code: 'INVALID_INVOICE_AMOUNT', reason: error.message });
      }
      throw error;
    }
  }

  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    if (!item) throw new NotFoundException('Invoice not found');
    return item;
  }

  async updateStatus(tenantId: string, id: string, status: InvoiceStatus) {
    await this.get(tenantId, id);
    return this.repo.updateStatus(tenantId, id, status);
  }

  /**
   * Renders the invoice PDF.
   *
   * forClient=true additionally requires the invoice to be client-visible and
   * out of DRAFT, so the client PDF route cannot leak an unsent invoice.
   */
  async renderPdf(
    tenantId: string,
    id: string,
    options: { forClient: boolean } = { forClient: false },
  ): Promise<RenderedInvoicePdf> {
    const invoice = await this.repo.getForPdf(tenantId, id);
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (options.forClient && (!invoice.clientVisible || invoice.status === InvoiceStatus.DRAFT)) {
      throw new NotFoundException('Invoice not found');
    }

    const buffer = await this.pdf.render({
      currency: invoice.currency,
      dueAt: invoice.dueAt,
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt,
      lines: invoice.lines,
      paidCents: invoice.paidCents,
      projectName: invoice.project?.name ?? null,
      status: invoice.status,
      subtotalCents: invoice.subtotalCents,
      tenantName: invoice.tenant?.name ?? null,
      totalCents: invoice.totalCents,
    });

    // The filename is derived from the invoice number, which is validated on
    // create; it is sanitised again here because it ends up in a header.
    const safeNumber = invoice.invoiceNumber.replace(/[^A-Za-z0-9._-]/g, '_');
    return { buffer, filename: `invoice-${safeNumber}.pdf` };
  }

  /**
   * Emails the invoice PDF to the client and marks the invoice as sent.
   *
   * Ordering is deliberate: the mail must succeed before the invoice is marked
   * SENT, so a failed send never leaves an invoice claiming it was delivered.
   */
  async send(actor: InvoiceActor, id: string, dto: SendInvoiceDto) {
    const { tenantId } = actor;
    const invoice = await this.repo.getForPdf(tenantId, id);
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException({
        code: 'INVOICE_VOID',
        reason: 'A voided invoice cannot be sent.',
      });
    }

    const recipients = await this.resolveRecipients(tenantId, invoice.projectId, dto.recipients);
    if (recipients.length === 0) {
      throw new BadRequestException({
        code: 'NO_RECIPIENT',
        reason:
          'No recipient. Pass "recipients", or add a CLIENT member to the invoice project.',
      });
    }

    if (!this.mail.isConfigured) {
      throw new ServiceUnavailableException({
        code: 'MAIL_NOT_CONFIGURED',
        reason: 'Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.',
      });
    }

    const { buffer, filename } = await this.renderPdf(tenantId, id);
    const balanceDue = invoice.totalCents - invoice.paidCents;

    const sent = await this.mail.sendDocument({
      attachment: { content: buffer, contentType: 'application/pdf', filename },
      subject: dto.subject ?? `Invoice ${invoice.invoiceNumber}`,
      text:
        dto.message ??
        [
          `Invoice ${invoice.invoiceNumber} is attached.`,
          `Total: ${formatMoney(invoice.totalCents, invoice.currency)}`,
          `Balance due: ${formatMoney(balanceDue, invoice.currency)}`,
        ].join('\n'),
      to: recipients,
    });

    if (!sent) {
      throw new ServiceUnavailableException({
        code: 'MAIL_SEND_FAILED',
        reason: 'The invoice email could not be sent.',
      });
    }

    const updated = await this.repo.markSent(tenantId, id, new Date());

    await this.recordAudit(actor, 'invoice.sent', id, {
      outcome: AuditOutcome.SUCCESS,
      payload: { invoiceNumber: invoice.invoiceNumber, recipientCount: recipients.length },
    });

    // Staff who may read invoices. No amount and no recipient address in the
    // body: the notification names the invoice, the invoice holds the money.
    await this.notifications.notify({
      tenantId,
      recipientRoles: [MembershipRole.OWNER, MembershipRole.MANAGER],
      audience: 'INTERNAL',
      actorUserId: actor.actorId,
      dedupeKey: `invoice.sent:${id}`,
      title: 'Invoice sent',
      body: `Invoice ${invoice.invoiceNumber} was sent to the client.`,
      resourceType: 'invoice',
      resourceId: id,
    });

    return { invoice: updated, recipientCount: recipients.length, sent: true };
  }

  /**
   * Explicit recipients win. Otherwise the CLIENT members of the invoice's
   * project are used, so a normal send needs no address at all.
   */
  private async resolveRecipients(
    tenantId: string,
    projectId: string | null,
    explicit?: string[],
  ): Promise<string[]> {
    if (explicit && explicit.length > 0) return explicit;
    if (!projectId) return [];

    const users = await this.repo.findProjectClientEmails(tenantId, projectId);
    return users.map((user) => user.email);
  }

  /**
   * Re-derives paidCents and status from the recorded payments, and posts the
   * invoice's revenue once it is settled in full.
   *
   * Called after a payment is recorded. Revenue is posted at most once per
   * invoice, so a later payment cannot double-count it.
   */
  async syncAfterPayment(actor: InvoiceActor, invoiceId: string) {
    const { tenantId } = actor;
    const updated = await this.repo.recalculatePaid(tenantId, invoiceId);
    if (!updated) return null;

    if (updated.status === InvoiceStatus.PAID) {
      const { created } = await this.repo.postRevenueOnce({
        actorId: actor.actorId,
        amountCents: updated.totalCents,
        clientScopeKey: updated.clientScopeKey,
        currency: updated.currency,
        invoiceId: updated.id,
        projectId: updated.projectId,
        tenantId,
      });

      if (created) {
        await this.recordAudit(actor, 'revenue.created', invoiceId, {
          outcome: AuditOutcome.SUCCESS,
          payload: { amountCents: updated.totalCents, invoiceId, sourceType: 'invoice' },
        });
      }
    }

    return updated;
  }

  private toMembershipRole(role: string): MembershipRole | undefined {
    return (Object.values(MembershipRole) as string[]).includes(role)
      ? (role as MembershipRole)
      : undefined;
  }

  /** Audit writes are best-effort: a logging failure must not fail the request. */
  private async recordAudit(
    actor: InvoiceActor,
    action: string,
    resourceId: string,
    detail: { outcome: AuditOutcome; payload?: Record<string, unknown> },
  ): Promise<void> {
    try {
      await this.audit.createAuditEvent({
        action,
        actorId: actor.actorId,
        actorRole: this.toMembershipRole(actor.role),
        outcome: detail.outcome,
        payload: detail.payload,
        permissionResult: AuditPermissionResult.ALLOWED,
        resourceId,
        resourceType: 'invoice',
        sessionId: actor.sessionId,
        tenantId: actor.tenantId,
      });
    } catch {
      this.logger.warn(`audit_write_failed action=${action}`);
    }
  }
}
