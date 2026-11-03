import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChatChannelType, MembershipRole, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ClientScopeService } from '../memberships/client-scope.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClientReplyDto, OpenComplaintDto, StaffReplyDto } from './dto/complaint.dto';

type Actor = { tenantId: string; userId: string; role: string };
export type ComplaintStatus = 'OPEN' | 'ANSWERED' | 'RESOLVED';

/**
 * A client conversation with management comes in two kinds that share every
 * rule below (D02, owner directive 2026-11-02): a problem report (complaint)
 * and a request for new work. ChatChannel.resourceType carries the kind; the
 * generic chat API never lists either (chat.service.ts).
 */
export type ConversationKind = 'complaint' | 'request';
export interface KindSpec {
  /** ChatChannel.resourceType and Notification.resourceType. */
  resource: ConversationKind;
  /** AuditEvent.resourceType. */
  audit: string;
  /** Audit action prefix and notification dedupe prefix. */
  prefix: ConversationKind;
  text: { opened: string; added: string; reopened: string; answered: string; resolved: string };
}
export const KINDS = Object.freeze({
  complaint: {
    resource: 'complaint', audit: 'Complaint', prefix: 'complaint',
    text: { opened: 'A client reported a problem', added: 'A client added to a problem report', reopened: 'A client reopened a problem report', answered: 'We answered your problem report', resolved: 'Your problem report was resolved' },
  },
  request: {
    resource: 'request', audit: 'WorkRequest', prefix: 'request',
    text: { opened: 'A client requested new work', added: 'A client added to a work request', reopened: 'A client reopened a work request', answered: 'We answered your work request', resolved: 'Your work request was closed' },
  },
} satisfies Record<ConversationKind, KindSpec>);
/** ChatChannel.resourceType that marks a problem report (kept for existing imports). */
export const COMPLAINT_RESOURCE: ConversationKind = KINDS.complaint.resource;
/** Every resourceType the generic chat API must exclude. */
export const CONVERSATION_RESOURCES: ConversationKind[] = Object.values(KINDS).map((k) => k.resource);
const MANAGEMENT: string[] = [MembershipRole.OWNER, MembershipRole.MANAGER];

const CHANNEL = {
  id: true, tenantId: true, name: true, resourceId: true, clientScopeKey: true, createdAt: true, updatedAt: true,
  messages: { orderBy: { createdAt: 'asc' as const }, select: { id: true, body: true, clientVisible: true, createdByUserId: true, createdAt: true } },
} satisfies Prisma.ChatChannelSelect;
type Channel = Prisma.ChatChannelGetPayload<{ select: typeof CHANNEL }>;

/**
 * "Report a problem" (owner decision 2026-11-02). A client's complaint goes to
 * management, never automatically to the employee it may be about:
 *
 *  - the report is a CLIENT ChatChannel tagged resourceType "complaint" with the
 *    client as its only member; the generic chat routes exclude these channels,
 *    so employees cannot read them there either;
 *  - the client's text and every answer are ChatMessages; a message with
 *    clientVisible=false is an internal management note the client never gets;
 *  - open/resolved/reopened are audit events (resourceType "Complaint"), so no
 *    new table or migration is needed; the client sees the company, never a
 *    person.
 *
 * Routing: every ACTIVE MANAGER of the company is told; a company without a
 * manager falls back to its OWNER(s).
 */
@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientScope: ClientScopeService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** Which conversation this service instance handles; WorkRequestsService overrides it. */
  protected readonly kind: KindSpec = KINDS.complaint;

  private action(name: 'opened' | 'resolved' | 'reopened' | 'note' | 'answered'): string {
    return `${this.kind.prefix}.${name}`;
  }
  private stateActions(): string[] {
    return [this.action('opened'), this.action('resolved'), this.action('reopened')];
  }

  // ── Client ─────────────────────────────────────────────────────────────────

  async open(actor: Actor, dto: OpenComplaintDto) {
    const scope = await this.requireClient(actor);
    const delivery = dto.deliveryId ? await this.ownDelivery(actor.tenantId, scope, dto.deliveryId) : null;
    const channel = await this.prisma.chatChannel.create({
      data: {
        tenantId: actor.tenantId, type: ChatChannelType.CLIENT, name: dto.subject.trim(),
        resourceType: this.kind.resource, resourceId: delivery?.id ?? null, clientScopeKey: scope, createdByUserId: actor.userId,
        memberships: { create: { tenantId: actor.tenantId, userId: actor.userId, role: MembershipRole.CLIENT, clientScopeKey: scope } },
        messages: { create: { tenantId: actor.tenantId, body: dto.body.trim(), createdByUserId: actor.userId, clientVisible: true, clientScopeKey: scope } },
      },
      select: CHANNEL,
    });
    // The report exists only once management can find it: the state event is strict.
    await this.record(actor, this.action('opened'), channel.id, { subject: channel.name, deliveryId: delivery?.id ?? null }, true);
    await this.tellManagement(actor, channel, `${this.kind.prefix}.opened:${channel.id}`, this.kind.text.opened);
    return this.clientView(channel, await this.statusOf([channel.id]));
  }

  async listForClient(actor: Actor) {
    const scope = await this.requireClient(actor);
    const rows = await this.prisma.chatChannel.findMany({
      where: { tenantId: actor.tenantId, resourceType: this.kind.resource, clientScopeKey: scope },
      orderBy: { updatedAt: 'desc' },
      select: CHANNEL,
    });
    const status = await this.statusOf(rows.map((r) => r.id));
    return Promise.all(rows.map((r) => this.clientView(r, status)));
  }

  async getForClient(actor: Actor, id: string) {
    const scope = await this.requireClient(actor);
    const channel = await this.findForClient(actor.tenantId, scope, id);
    return this.clientView(channel, await this.statusOf([channel.id]));
  }

  /** A follow-up by the client; on a resolved report it reopens the report. */
  async clientReply(actor: Actor, id: string, dto: ClientReplyDto) {
    const scope = await this.requireClient(actor);
    const channel = await this.findForClient(actor.tenantId, scope, id);
    const wasResolved = (await this.statusOf([channel.id])).get(channel.id) === 'RESOLVED';
    const message = await this.prisma.chatMessage.create({
      data: { tenantId: actor.tenantId, channelId: channel.id, body: dto.body.trim(), createdByUserId: actor.userId, clientVisible: true, clientScopeKey: scope },
      select: { id: true },
    });
    await this.prisma.chatChannel.update({ where: { id: channel.id }, data: { updatedAt: new Date() } });
    if (wasResolved) await this.record(actor, this.action('reopened'), channel.id, { by: 'client' }, true);
    await this.tellManagement(actor, channel, `${this.kind.prefix}.message:${message.id}`, wasResolved ? this.kind.text.reopened : this.kind.text.added);
    return this.getForClient(actor, id);
  }

  // ── Management ─────────────────────────────────────────────────────────────

  async list(actor: Actor, status?: ComplaintStatus) {
    this.requireManagement(actor);
    const rows = await this.prisma.chatChannel.findMany({
      where: { tenantId: actor.tenantId, resourceType: this.kind.resource },
      orderBy: { updatedAt: 'desc' },
      select: CHANNEL,
    });
    const states = await this.statusOf(rows.map((r) => r.id));
    const views = await Promise.all(rows.map((r) => this.staffView(r, states)));
    return status ? views.filter((v) => v.status === status) : views;
  }

  async get(actor: Actor, id: string) {
    this.requireManagement(actor);
    const channel = await this.find(actor.tenantId, id);
    return this.staffView(channel, await this.statusOf([channel.id]));
  }

  /** An answer the client sees (as the company), or an internal note nobody outside management reads. */
  async staffReply(actor: Actor, id: string, dto: StaffReplyDto) {
    this.requireManagement(actor);
    const channel = await this.find(actor.tenantId, id);
    const internal = dto.internal === true;
    const message = await this.prisma.chatMessage.create({
      data: { tenantId: actor.tenantId, channelId: channel.id, body: dto.body.trim(), createdByUserId: actor.userId, clientVisible: !internal, clientScopeKey: channel.clientScopeKey },
      select: { id: true },
    });
    await this.prisma.chatChannel.update({ where: { id: channel.id }, data: { updatedAt: new Date() } });
    await this.record(actor, internal ? this.action('note') : this.action('answered'), channel.id, { messageId: message.id });
    if (!internal) await this.tellClient(actor, channel, `${this.kind.prefix}.reply:${message.id}`, this.kind.text.answered);
    return this.get(actor, id);
  }

  async resolve(actor: Actor, id: string) {
    this.requireManagement(actor);
    const channel = await this.find(actor.tenantId, id);
    if ((await this.statusOf([channel.id])).get(channel.id) !== 'RESOLVED') {
      await this.record(actor, this.action('resolved'), channel.id, {}, true);
      await this.prisma.chatChannel.update({ where: { id: channel.id }, data: { updatedAt: new Date() } });
      await this.tellClient(actor, channel, `${this.kind.prefix}.resolved:${channel.id}:${Date.now()}`, this.kind.text.resolved);
    }
    return this.get(actor, id);
  }

  async reopen(actor: Actor, id: string) {
    this.requireManagement(actor);
    const channel = await this.find(actor.tenantId, id);
    if ((await this.statusOf([channel.id])).get(channel.id) === 'RESOLVED') {
      await this.record(actor, this.action('reopened'), channel.id, { by: 'staff' }, true);
      await this.prisma.chatChannel.update({ where: { id: channel.id }, data: { updatedAt: new Date() } });
    }
    return this.get(actor, id);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async requireClient(actor: Actor): Promise<string> {
    if (actor.role !== MembershipRole.CLIENT) throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'clients_only' });
    const scope = await this.clientScope.resolve(actor.tenantId, actor.userId, actor.role);
    if (scope === null) throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'client_scope_missing' });
    return scope;
  }

  private requireManagement(actor: Actor) {
    if (!MANAGEMENT.includes(actor.role)) throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'management_only' });
  }

  private async find(tenantId: string, id: string): Promise<Channel> {
    const channel = await this.prisma.chatChannel.findFirst({ where: { id, tenantId, resourceType: this.kind.resource }, select: CHANNEL });
    if (!channel) throw new NotFoundException('Report not found');
    return channel;
  }

  private async findForClient(tenantId: string, scope: string, id: string): Promise<Channel> {
    const channel = await this.prisma.chatChannel.findFirst({ where: { id, tenantId, resourceType: this.kind.resource, clientScopeKey: scope }, select: CHANNEL });
    if (!channel) throw new NotFoundException('Report not found');
    return channel;
  }

  /** Only a delivery the client can see may be referenced; anything else is "not found". */
  private async ownDelivery(tenantId: string, scope: string, id: string) {
    const delivery = await this.prisma.approvalRequest.findFirst({
      where: { id, tenantId, clientVisible: true, clientScopeKey: scope },
      select: { id: true, title: true },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  private async deliveryTitle(id: string | null) {
    if (!id) return null;
    const d = await this.prisma.approvalRequest.findUnique({ where: { id }, select: { id: true, title: true } });
    return d ? { id: d.id, title: d.title } : null;
  }

  /** OPEN until the company answers, ANSWERED until the client writes again, RESOLVED by management. */
  private async statusOf(ids: string[]): Promise<Map<string, ComplaintStatus>> {
    const state = new Map<string, ComplaintStatus>();
    if (!ids.length) return state;
    const events = await this.prisma.auditEvent.findMany({
      where: { resourceType: this.kind.audit, resourceId: { in: ids }, action: { in: this.stateActions() } },
      orderBy: { createdAt: 'asc' },
      select: { resourceId: true, action: true },
    });
    for (const e of events) if (e.resourceId) state.set(e.resourceId, e.action === this.action('resolved') ? 'RESOLVED' : 'OPEN');
    for (const id of ids) if (!state.has(id)) state.set(id, 'OPEN');
    return state;
  }

  private withAnswered(channel: Channel, status: ComplaintStatus, clients: Set<string>): ComplaintStatus {
    if (status === 'RESOLVED') return status;
    const last = [...channel.messages].reverse().find((m) => m.clientVisible);
    return last && !clients.has(last.createdByUserId ?? '') ? 'ANSWERED' : 'OPEN';
  }

  private async clientUserIds(tenantId: string, scope: string | null) {
    if (!scope) return new Set<string>();
    const rows = await this.prisma.tenantMembership.findMany({ where: { tenantId, role: MembershipRole.CLIENT, clientScopeKey: scope }, select: { userId: true } });
    return new Set(rows.map((r) => r.userId));
  }

  /** The client's shape: the company's answers carry no name, id or role of any person. */
  private async clientView(channel: Channel, states: Map<string, ComplaintStatus>) {
    const clients = await this.clientUserIds(channel.tenantId, channel.clientScopeKey);
    const visible = channel.messages.filter((m) => m.clientVisible);
    return {
      id: channel.id,
      subject: channel.name,
      status: this.withAnswered(channel, states.get(channel.id) ?? 'OPEN', clients),
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      delivery: await this.deliveryTitle(channel.resourceId),
      messages: visible.map((m) => ({ id: m.id, from: clients.has(m.createdByUserId ?? '') ? ('you' as const) : ('company' as const), body: m.body, at: m.createdAt })),
    };
  }

  private async staffView(channel: Channel, states: Map<string, ComplaintStatus>) {
    const clients = await this.clientUserIds(channel.tenantId, channel.clientScopeKey);
    const customer = channel.clientScopeKey
      ? await this.prisma.customer.findFirst({ where: { tenantId: channel.tenantId, clientScopeKey: channel.clientScopeKey }, select: { id: true, name: true } })
      : null;
    const staffIds = [...new Set(channel.messages.map((m) => m.createdByUserId).filter((id): id is string => !!id && !clients.has(id)))];
    const staff = new Map((await this.prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, displayName: true, email: true } })).map((u) => [u.id, u.displayName || u.email]));
    return {
      id: channel.id,
      subject: channel.name,
      status: this.withAnswered(channel, states.get(channel.id) ?? 'OPEN', clients),
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      customer: { clientScopeKey: channel.clientScopeKey, name: customer?.name ?? null },
      delivery: await this.deliveryTitle(channel.resourceId),
      messages: channel.messages.map((m) => ({
        id: m.id,
        from: clients.has(m.createdByUserId ?? '') ? ('client' as const) : ('company' as const),
        internal: !m.clientVisible,
        author: clients.has(m.createdByUserId ?? '') ? null : staff.get(m.createdByUserId ?? '') ?? null,
        body: m.body,
        at: m.createdAt,
      })),
    };
  }

  /** Active managers of the company; a company without one falls back to its owners. */
  private async managementUserIds(tenantId: string): Promise<string[]> {
    const managers = await this.prisma.tenantMembership.findMany({ where: { tenantId, role: MembershipRole.MANAGER, status: 'ACTIVE' }, select: { userId: true } });
    if (managers.length) return managers.map((m) => m.userId);
    const owners = await this.prisma.tenantMembership.findMany({ where: { tenantId, role: MembershipRole.OWNER, status: 'ACTIVE' }, select: { userId: true } });
    return owners.map((m) => m.userId);
  }

  private async tellManagement(actor: Actor, channel: Channel, dedupeKey: string, title: string) {
    await this.notifications.notify({
      tenantId: actor.tenantId, recipientUserIds: await this.managementUserIds(actor.tenantId), audience: 'DIRECT', actorUserId: actor.userId,
      dedupeKey, title, body: channel.name.slice(0, 240), resourceType: this.kind.resource, resourceId: channel.id,
    });
  }

  private async tellClient(actor: Actor, channel: Channel, dedupeKey: string, title: string) {
    if (!channel.clientScopeKey) return;
    const clients = await this.prisma.tenantMembership.findMany({
      where: { tenantId: actor.tenantId, role: MembershipRole.CLIENT, status: 'ACTIVE', clientScopeKey: channel.clientScopeKey },
      select: { userId: true },
    });
    await this.notifications.notify({
      tenantId: actor.tenantId, recipientUserIds: clients.map((c) => c.userId), audience: 'DIRECT', actorUserId: actor.userId,
      dedupeKey, title, body: channel.name.slice(0, 240), resourceType: this.kind.resource, resourceId: channel.id,
    });
  }

  private async record(actor: Actor, action: string, id: string, payload: Record<string, unknown>, strict = false) {
    const write = this.audit.createAuditEvent({
      tenantId: actor.tenantId, actorId: actor.userId, actorRole: actor.role as MembershipRole,
      resourceType: this.kind.audit, resourceId: id, action,
      permissionResult: AuditPermissionResult.ALLOWED, outcome: AuditOutcome.SUCCESS, payload,
    });
    if (strict) await write;
    else await write.catch((err: unknown) => this.logger.error(`Could not record ${action}`, err));
  }
}

/** Same rules, different kind: a client's request for new work goes to management. */
@Injectable()
export class WorkRequestsService extends ComplaintsService {
  protected override readonly kind: KindSpec = KINDS.request;
}
