import { BadRequestException, Injectable } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import { SHOOTING_LABEL, parseAppointmentDescription } from '../appointments/appointment-format';
import { KINDS } from '../complaints/complaints.service';
import { PermissionService } from '../permissions/permission.service';
import { PermissionAction, PermissionRequirement, PermissionResource } from '../permissions/permission.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  HistoryCursor, HistoryEntry, HistorySection, SOURCE, afterCursor, entryId, excerpt, pageHistory, parseHistoryQuery,
} from './customer-history';
import { CustomersService } from './customers.service';

export interface HistoryCaller {
  sub: string;
  tenantId: string;
  role: string;
}

const READ = (resource: PermissionResource, sensitive = false): PermissionRequirement => ({ action: PermissionAction.READ, resource, sensitive });
const MANAGEMENT: string[] = [MembershipRole.OWNER, MembershipRole.MANAGER];
/** Most channels of one customer whose state events are followed in one read. */
const CHANNEL_CAP = 2000;

const DECISION_EVENT = { APPROVE: 'approved', REQUEST_CHANGES: 'changes_requested', REJECT: 'rejected', CANCEL: 'replied' } as const;
const STATE_ACTIONS: Record<string, { kind: 'problem' | 'request'; event: 'resolved' | 'reopened' }> = {
  [`${KINDS.complaint.prefix}.resolved`]: { kind: 'problem', event: 'resolved' },
  [`${KINDS.complaint.prefix}.reopened`]: { kind: 'problem', event: 'reopened' },
  [`${KINDS.request.prefix}.resolved`]: { kind: 'request', event: 'resolved' },
  [`${KINDS.request.prefix}.reopened`]: { kind: 'request', event: 'reopened' },
};
const conversationKind = (resourceType: string | null): 'problem' | 'request' => (resourceType === KINDS.request.resource ? 'request' : 'problem');

/**
 * Customer history (D07; Blueprint §43.2 "Customer 360 … timeline"). One read
 * that lists what happened with a customer, newest first, from the rows that
 * already record it: delivery rounds and their decisions, work requests and
 * problem reports with their messages, appointments, invoices and payments.
 *
 * - The customer needs CUSTOMER read (controller); a foreign id is 404.
 * - A section is included only when the caller may read its source, exactly
 *   as the overview does: deliveries with APPROVAL read and appointments with
 *   TASK read, both inside a contractor's work scope; invoices with INVOICE
 *   read; amounts and payments only with the sensitive FINANCE permission
 *   (OWNER); requests and problem reports only for OWNER and MANAGER, the
 *   rule of the complaints module (never shown to the employee concerned).
 * - Internal notes are management notes: they are part of the conversations
 *   section, flagged `internal`, and therefore never reach an employee, a
 *   contractor or a client.
 * - No staff identity leaves this service: a speaker is `client` or `company`.
 * - Read only. No row is written, no schema is added.
 */
@Injectable()
export class CustomerHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly resourceScope: ResourceScopeService,
    private readonly customers: CustomersService,
  ) {}

  async history(caller: HistoryCaller, id: string, limitParam?: string, beforeParam?: string) {
    const query = parseHistoryQuery(limitParam, beforeParam);
    if (!query.ok) throw new BadRequestException({ code: query.code });
    const { limit, cursor } = query;
    const { tenantId } = caller;
    const customer = await this.customers.get(tenantId, id);

    const may = async (requirement: PermissionRequirement) => (await this.permissions.decide(requirement, caller.sub, tenantId, caller.role)).allowed;
    const [deliveries, appointments, invoices, finance] = await Promise.all([
      may(READ(PermissionResource.APPROVAL)), may(READ(PermissionResource.TASK)),
      may(READ(PermissionResource.INVOICE)), may(READ(PermissionResource.FINANCE, true)),
    ]);
    const conversations = MANAGEMENT.includes(caller.role);
    const sections: HistorySection[] = [];
    if (deliveries) sections.push('deliveries');
    if (conversations) sections.push('conversations');
    if (appointments) sections.push('appointments');
    if (invoices) sections.push('invoices');
    if (invoices && finance) sections.push('finance');

    const scope = await this.resourceScope.resolveWorkScope(tenantId, caller.sub);
    const clients = deliveries || conversations ? await this.clientUserIds(tenantId, customer.clientScopeKey) : new Set<string>();
    const take = limit + 1;

    const parts = await Promise.all([
      deliveries ? this.deliveries(tenantId, id, customer.clientScopeKey, scope ? this.resourceScope.fileWhere(scope) : undefined, clients, cursor, take) : [],
      conversations ? this.conversations(tenantId, customer.clientScopeKey, clients, cursor, take) : [],
      appointments ? this.appointments(tenantId, id, this.resourceScope.taskWhere(scope), cursor, take) : [],
      invoices ? this.invoices(tenantId, id, invoices && finance, cursor, take) : [],
    ]);
    const page = pageHistory(parts.flat(), limit);
    return { customer: { id: customer.id, name: customer.name }, sections, ...page };
  }

  /** Delivery rounds (client-visible approval requests) and every decision on them. */
  private async deliveries(
    tenantId: string, customerId: string, clientScopeKey: string, fileScope: Prisma.FileAssetWhereInput | undefined,
    clients: Set<string>, cursor: HistoryCursor | null, take: number,
  ): Promise<HistoryEntry[]> {
    const round: Prisma.ApprovalRequestWhereInput = {
      tenantId,
      clientVisible: true,
      OR: [{ fileAsset: { customerId } }, { clientScopeKey }],
      // A scoped caller (contractor) sees only deliveries of files in its scope.
      ...(fileScope && { fileAsset: fileScope }),
    };
    const [rounds, decisions] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where: { AND: [round, afterCursor(SOURCE.delivery, 'createdAt', cursor)] },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        select: { id: true, title: true, status: true, createdAt: true, dueAt: true, fileAssetId: true, fileVersion: { select: { versionNumber: true } } },
      }),
      this.prisma.approvalDecision.findMany({
        where: { AND: [{ tenantId, approvalRequest: round }, afterCursor(SOURCE.decision, 'createdAt', cursor)] },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        select: {
          id: true, decision: true, note: true, createdAt: true, decidedByUserId: true,
          approvalRequest: { select: { id: true, title: true, fileAssetId: true, fileVersion: { select: { versionNumber: true } } } },
        },
      }),
    ]);
    const ref = (fileAssetId: string | null, requestId: string) => ({ type: 'file' as const, id: fileAssetId ?? requestId });
    return [
      ...rounds.map((r): HistoryEntry => ({
        id: entryId(SOURCE.delivery, r.id), at: r.createdAt, kind: 'delivery', event: 'sent', title: r.title, status: r.status, from: 'company',
        ref: ref(r.fileAssetId, r.id),
        meta: { version: r.fileVersion?.versionNumber ?? null, reviewBy: r.dueAt ? r.dueAt.toISOString() : null },
      })),
      ...decisions.map((d): HistoryEntry => ({
        id: entryId(SOURCE.decision, d.id), at: d.createdAt, kind: 'delivery', event: DECISION_EVENT[d.decision], title: d.approvalRequest.title,
        from: clients.has(d.decidedByUserId ?? '') ? 'client' : 'company', note: excerpt(d.note),
        ref: ref(d.approvalRequest.fileAssetId, d.approvalRequest.id),
        meta: { version: d.approvalRequest.fileVersion?.versionNumber ?? null },
      })),
    ];
  }

  /** Work requests and problem reports: opened, every message, resolved and reopened. Management only. */
  private async conversations(tenantId: string, clientScopeKey: string, clients: Set<string>, cursor: HistoryCursor | null, take: number): Promise<HistoryEntry[]> {
    const channel: Prisma.ChatChannelWhereInput = {
      tenantId, clientScopeKey, resourceType: { in: [KINDS.complaint.resource, KINDS.request.resource] },
    };
    const all = await this.prisma.chatChannel.findMany({
      where: channel, orderBy: { createdAt: 'desc' }, take: CHANNEL_CAP, select: { id: true, name: true, resourceType: true, createdAt: true },
    });
    if (!all.length) return [];
    const byId = new Map(all.map((c) => [c.id, c]));
    const [opened, messages, states] = await Promise.all([
      this.prisma.chatChannel.findMany({
        where: { AND: [channel, afterCursor(SOURCE.conversation, 'createdAt', cursor)] },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        select: { id: true, name: true, resourceType: true, createdAt: true },
      }),
      this.prisma.chatMessage.findMany({
        where: { AND: [{ tenantId, channel }, afterCursor(SOURCE.message, 'createdAt', cursor)] },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        select: { id: true, body: true, clientVisible: true, createdByUserId: true, createdAt: true, channelId: true },
      }),
      this.prisma.auditEvent.findMany({
        where: {
          AND: [
            { tenantId, resourceType: { in: [KINDS.complaint.audit, KINDS.request.audit] }, action: { in: Object.keys(STATE_ACTIONS) }, resourceId: { in: all.map((c) => c.id) } },
            afterCursor(SOURCE.state, 'createdAt', cursor),
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        select: { id: true, action: true, resourceId: true, createdAt: true, redactedPayload: true },
      }),
    ]);
    const refOf = (c: { id: string; resourceType: string | null }) => ({ type: conversationKind(c.resourceType), id: c.id });
    const entries: HistoryEntry[] = opened.map((c) => ({
      id: entryId(SOURCE.conversation, c.id), at: c.createdAt, kind: conversationKind(c.resourceType), event: 'opened', title: c.name, from: 'client', ref: refOf(c),
    }));
    for (const m of messages) {
      const c = byId.get(m.channelId);
      if (!c) continue;
      entries.push({
        id: entryId(SOURCE.message, m.id), at: m.createdAt, kind: conversationKind(c.resourceType), event: 'message', title: c.name,
        from: clients.has(m.createdByUserId ?? '') ? 'client' : 'company', ...(m.clientVisible ? {} : { internal: true }), note: excerpt(m.body), ref: refOf(c),
      });
    }
    for (const s of states) {
      const c = s.resourceId ? byId.get(s.resourceId) : undefined;
      const state = STATE_ACTIONS[s.action];
      if (!c || !state) continue;
      const by = (s.redactedPayload as { by?: unknown } | null)?.by;
      entries.push({
        id: entryId(SOURCE.state, s.id), at: s.createdAt, kind: state.kind, event: state.event, title: c.name,
        from: state.event === 'reopened' && by === 'client' ? 'client' : 'company', ref: refOf(c),
      });
    }
    return entries;
  }

  /** Shooting appointments of the customer's projects, at the time they take place. */
  private async appointments(tenantId: string, customerId: string, taskScope: Prisma.TaskWhereInput, cursor: HistoryCursor | null, take: number): Promise<HistoryEntry[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        AND: [
          { tenantId, project: { customerId }, dueAt: { not: null }, labels: { some: { label: { name: SHOOTING_LABEL } } } },
          taskScope,
          afterCursor(SOURCE.appointment, 'dueAt', cursor),
        ],
      },
      orderBy: [{ dueAt: 'desc' }, { id: 'desc' }],
      take,
      select: { id: true, title: true, status: true, dueAt: true, description: true },
    });
    return rows.map((t): HistoryEntry => ({
      id: entryId(SOURCE.appointment, t.id), at: t.dueAt as Date, kind: 'appointment', event: 'appointment', title: t.title, status: t.status,
      ref: { type: 'task', id: t.id }, meta: { location: parseAppointmentDescription(t.description).location || null },
    }));
  }

  /** Invoices once they are no longer drafts; amounts and payments only for the OWNER. */
  private async invoices(tenantId: string, customerId: string, money: boolean, cursor: HistoryCursor | null, take: number): Promise<HistoryEntry[]> {
    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { AND: [{ tenantId, customerId, status: { not: 'DRAFT' } }, afterCursor(SOURCE.invoice, 'createdAt', cursor)] },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        select: { id: true, invoiceNumber: true, status: true, createdAt: true, issuedAt: true, dueAt: true, currency: true, totalCents: money },
      }),
      money
        ? this.prisma.payment.findMany({
            where: { AND: [{ tenantId, invoice: { tenantId, customerId } }, afterCursor(SOURCE.payment, 'createdAt', cursor)] },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take,
            select: { id: true, amountCents: true, currency: true, status: true, method: true, createdAt: true, invoiceId: true, invoice: { select: { invoiceNumber: true } } },
          })
        : [],
    ]);
    return [
      ...invoices.map((i): HistoryEntry => ({
        id: entryId(SOURCE.invoice, i.id), at: i.createdAt, kind: 'invoice', event: 'invoice', title: `Invoice ${i.invoiceNumber}`, status: i.status,
        ref: { type: 'invoice', id: i.id },
        meta: {
          issuedAt: i.issuedAt ? i.issuedAt.toISOString() : null, dueAt: i.dueAt ? i.dueAt.toISOString() : null,
          ...(money ? { totalCents: (i as { totalCents?: number }).totalCents ?? null, currency: i.currency } : {}),
        },
      })),
      ...payments.map((p): HistoryEntry => ({
        id: entryId(SOURCE.payment, p.id), at: p.createdAt, kind: 'payment', event: 'payment', title: `Payment for invoice ${p.invoice?.invoiceNumber ?? ''}`.trim(), status: p.status,
        ref: { type: 'invoice', id: p.invoiceId ?? p.id }, meta: { amountCents: p.amountCents, currency: p.currency, method: p.method },
      })),
    ];
  }

  /** The customer's own portal users: what they wrote is shown as "client", everything else as "company". */
  private async clientUserIds(tenantId: string, clientScopeKey: string): Promise<Set<string>> {
    const rows = await this.prisma.tenantMembership.findMany({
      where: { tenantId, role: MembershipRole.CLIENT, clientScopeKey }, select: { userId: true },
    });
    return new Set(rows.map((r) => r.userId));
  }
}
