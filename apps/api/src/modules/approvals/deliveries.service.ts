import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApprovalStatus, FileVersionStatus, MembershipRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ClientScopeService } from '../memberships/client-scope.service';
import { FileVersionsService } from '../file-versions/file-versions.service';
import { safeClientFilename } from '../file-versions/client-file-privacy';
import { extensionOf } from '../storage/object-key';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClientDeliveryDecisionDto, SubmitDeliveryDto } from './dto/delivery.dto';

/**
 * Client delivery and feedback, on the canonical ApprovalRequest/ApprovalDecision
 * (no new model, no migration).
 *
 * A delivery is a client-visible ApprovalRequest for one file version. Staff
 * (the task's assignee, or an OWNER/MANAGER) send it; the client approves or
 * requests changes; a change request goes straight to the responsible person,
 * who resubmits a new version. A resubmission closes the previous round with a
 * CANCEL decision carrying the reply, so the thread is the list of rounds.
 *
 * Rules that keep the client side safe:
 *  - the client scope is always taken from the file's project and the caller's
 *    membership, never from a request;
 *  - every client response is built here field by field: no user id, name or
 *    e-mail of staff is ever included; staff speak as the company.
 */
const OPEN_FOR_CLIENT: ApprovalStatus[] = [ApprovalStatus.REQUESTED, ApprovalStatus.CHANGES_REQUESTED];
const SHOWN_TO_CLIENT: ApprovalStatus[] = [...OPEN_FOR_CLIENT, ApprovalStatus.APPROVED];
const STAFF_ROLES: string[] = [MembershipRole.OWNER, MembershipRole.MANAGER];

type Actor = { tenantId: string; userId: string; role: string };

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientScope: ClientScopeService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly fileVersions: FileVersionsService,
  ) {}

  // ── Staff ──────────────────────────────────────────────────────────────────

  /** Send a file version to the client for review, or resubmit after a change request. */
  async submit(actor: Actor, dto: SubmitDeliveryDto) {
    const { tenantId } = actor;
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: dto.fileAssetId, tenantId },
      select: {
        id: true, name: true,
        project: { select: { id: true, clientVisible: true, clientScopeKey: true, customerId: true } },
        task: {
          select: {
            assignedToUserId: true,
            project: { select: { id: true, clientVisible: true, clientScopeKey: true, customerId: true } },
          },
        },
      },
    });
    if (!asset) throw new NotFoundException('File not found');
    const version = await this.prisma.fileVersion.findFirst({
      where: { id: dto.fileVersionId, tenantId, fileAssetId: asset.id },
      select: { id: true, versionNumber: true, status: true },
    });
    if (!version) throw new NotFoundException('File version not found');
    if (version.status !== FileVersionStatus.ACTIVE) {
      throw new ConflictException({ code: 'VERSION_NOT_ACTIVE', reason: 'Only an active version can be delivered.' });
    }

    // Who may deliver: the person the work is assigned to, or an OWNER/MANAGER.
    const responsible = asset.task?.assignedToUserId ?? null;
    if (!STAFF_ROLES.includes(actor.role) && responsible !== actor.userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'not_responsible_for_this_work' });
    }

    // The client comes from the project, which must be shared with that client.
    const project = asset.project ?? asset.task?.project ?? null;
    if (!project?.clientScopeKey || !project.clientVisible) {
      throw new ConflictException({
        code: 'PROJECT_NOT_SHARED',
        reason: 'Link the file to a project that belongs to a customer and is shared with the client.',
      });
    }
    const clientScopeKey = project.clientScopeKey;

    const previous = await this.prisma.approvalRequest.findFirst({
      where: { tenantId, fileAssetId: asset.id, clientVisible: true, status: { in: OPEN_FOR_CLIENT } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, fileVersion: { select: { versionNumber: true } } },
    });
    if (previous?.status === ApprovalStatus.REQUESTED) {
      throw new ConflictException({ code: 'DELIVERY_IN_REVIEW', reason: 'The client is already reviewing this file.' });
    }
    if (previous && (previous.fileVersion?.versionNumber ?? 0) >= version.versionNumber) {
      throw new ConflictException({ code: 'NEW_VERSION_REQUIRED', reason: 'Upload a new version with the changes first.' });
    }

    // Never send what the client could not open: the client copy is checked
    // first (identifying metadata removed, or a reason to fix the file).
    const release = await this.fileVersions.clientReleaseCheck(tenantId, asset.id, version.id);
    if (!release.ok) throw new UnprocessableEntityException({ code: 'FILE_NOT_CLEARED_FOR_CLIENT', reason: release.reason });

    const delivery = await this.prisma.$transaction(async (tx) => {
      if (previous) {
        // Close the round the client asked to change; the reply travels with it.
        const closed = await tx.approvalRequest.updateMany({
          where: { id: previous.id, tenantId, status: ApprovalStatus.CHANGES_REQUESTED },
          data: { status: ApprovalStatus.CANCELED },
        });
        if (closed.count !== 1) throw new ConflictException({ code: 'DELIVERY_CHANGED', reason: 'Reload and try again.' });
        await tx.approvalDecision.create({
          data: { tenantId, approvalRequestId: previous.id, decision: 'CANCEL', note: dto.message, decidedByUserId: actor.userId },
        });
      }
      await tx.fileAsset.update({
        where: { id: asset.id },
        data: { clientVisible: true, visibility: 'CLIENT_VISIBLE', clientScopeKey, customerId: project.customerId },
      });
      return tx.approvalRequest.create({
        data: {
          tenantId, title: asset.name, status: ApprovalStatus.REQUESTED,
          clientVisible: true, clientScopeKey, requestedByUserId: actor.userId,
          fileAssetId: asset.id, fileVersionId: version.id,
        },
        select: { id: true, status: true },
      });
    });

    await this.notifications.notify({
      tenantId,
      recipientUserIds: await this.clientMemberIds(tenantId, clientScopeKey),
      audience: 'DIRECT',
      actorUserId: actor.userId,
      dedupeKey: `delivery.submitted:${delivery.id}`,
      title: previous ? 'Revised delivery ready for your review' : 'New delivery ready for your review',
      body: asset.name,
      resourceType: 'delivery',
      resourceId: delivery.id,
    });
    await this.record(actor, previous ? 'delivery.resubmitted' : 'delivery.submitted', delivery.id, {
      fileAssetId: asset.id, versionNumber: version.versionNumber, replacedDeliveryId: previous?.id ?? null,
    });
    return { id: delivery.id, status: delivery.status, versionNumber: version.versionNumber, resubmission: !!previous };
  }

  /** Staff view of a file's delivery rounds, newest first. */
  async listForFile(tenantId: string, fileAssetId: string) {
    const asset = await this.prisma.fileAsset.findFirst({ where: { id: fileAssetId, tenantId }, select: { id: true } });
    if (!asset) throw new NotFoundException('File not found');
    const rounds = await this.prisma.approvalRequest.findMany({
      where: { tenantId, fileAssetId, clientVisible: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, createdAt: true, requestedByUserId: true,
        fileVersion: { select: { id: true, versionNumber: true } },
        decisions: { orderBy: { createdAt: 'asc' }, select: { decision: true, note: true, createdAt: true, decidedByUserId: true } },
      },
    });
    const clients = await this.clientUserIds(tenantId, rounds.flatMap((r) => r.decisions.map((d) => d.decidedByUserId)));
    return rounds.map((r) => ({
      ...r,
      decisions: r.decisions.map((d) => ({ ...d, from: clients.has(d.decidedByUserId ?? '') ? 'client' : 'company' })),
    }));
  }

  // ── Client ─────────────────────────────────────────────────────────────────

  /** The caller's deliveries: under review, waiting for a revision, or approved. */
  async listForClient(actor: Actor) {
    const scope = await this.clientScope.resolve(actor.tenantId, actor.userId, actor.role);
    const rows = await this.prisma.approvalRequest.findMany({
      where: {
        tenantId: actor.tenantId, clientVisible: true, status: { in: SHOWN_TO_CLIENT },
        // A deleted file leaves its rounds behind (fileAssetId set to null);
        // they would open as "not found", so they are not listed either.
        fileAssetId: { not: null },
        ...(scope === null ? {} : { clientScopeKey: scope }),
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, status: true, createdAt: true, updatedAt: true,
        fileVersion: { select: { versionNumber: true } },
        fileAsset: { select: { project: { select: { id: true, name: true } }, task: { select: { project: { select: { id: true, name: true } } } } } },
      },
    });
    return rows.map((r) => ({
      id: r.id, title: r.title, status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt,
      versionNumber: r.fileVersion?.versionNumber ?? null,
      project: r.fileAsset?.project ?? r.fileAsset?.task?.project ?? null,
    }));
  }

  /** One delivery with every round of the same file, in the caller's scope. */
  async getForClient(actor: Actor, id: string) {
    const { tenantId } = actor;
    const scope = await this.clientScope.resolve(tenantId, actor.userId, actor.role);
    const delivery = await this.prisma.approvalRequest.findFirst({
      where: { id, tenantId, clientVisible: true, status: { in: SHOWN_TO_CLIENT }, ...(scope === null ? {} : { clientScopeKey: scope }) },
      select: {
        id: true, title: true, status: true, createdAt: true, fileAssetId: true, fileVersionId: true, clientScopeKey: true,
        fileVersion: { select: { versionNumber: true, originalName: true, sizeBytes: true } },
        fileAsset: { select: { mimeType: true, project: { select: { id: true, name: true } }, task: { select: { project: { select: { id: true, name: true } } } } } },
      },
    });
    if (!delivery || !delivery.fileAssetId) throw new NotFoundException('Delivery not found');

    const rounds = await this.prisma.approvalRequest.findMany({
      where: { tenantId, fileAssetId: delivery.fileAssetId, clientVisible: true, clientScopeKey: delivery.clientScopeKey },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true, status: true,
        fileVersion: { select: { versionNumber: true } },
        decisions: { orderBy: { createdAt: 'asc' }, select: { decision: true, note: true, createdAt: true, decidedByUserId: true } },
      },
    });
    const clients = await this.clientUserIds(tenantId, rounds.flatMap((r) => r.decisions.map((d) => d.decidedByUserId)));
    const company = (await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }))?.name ?? 'Your agency';

    // Built field by field: no staff id, name or e-mail leaves this method.
    const thread: { at: Date; from: 'client' | 'company'; kind: string; note: string | null; versionNumber: number | null }[] = [];
    for (const round of rounds) {
      thread.push({ at: round.createdAt, from: 'company', kind: 'DELIVERED', note: null, versionNumber: round.fileVersion?.versionNumber ?? null });
      for (const d of round.decisions) {
        const fromClient = clients.has(d.decidedByUserId ?? '');
        thread.push({
          at: d.createdAt,
          from: fromClient ? 'client' : 'company',
          kind: d.decision === 'CANCEL' ? 'REVISION_SENT' : d.decision,
          note: d.note ?? null,
          versionNumber: null,
        });
      }
    }
    thread.sort((a, b) => a.at.getTime() - b.at.getTime());

    return {
      id: delivery.id, title: delivery.title, status: delivery.status, createdAt: delivery.createdAt,
      company,
      project: delivery.fileAsset?.project ?? delivery.fileAsset?.task?.project ?? null,
      file: {
        fileAssetId: delivery.fileAssetId, fileVersionId: delivery.fileVersionId,
        versionNumber: delivery.fileVersion?.versionNumber ?? null,
        name: safeClientFilename(delivery.title, delivery.fileVersion?.versionNumber ?? null, extensionOf(delivery.fileVersion?.originalName ?? delivery.title)),
        sizeBytes: delivery.fileVersion?.sizeBytes ?? null, mimeType: delivery.fileAsset?.mimeType ?? null,
      },
      canDecide: actor.role === MembershipRole.CLIENT && delivery.status === ApprovalStatus.REQUESTED,
      thread,
    };
  }

  /** The client approves the delivery or asks for changes; changes go straight to the responsible person. */
  async decideForClient(actor: Actor, id: string, dto: ClientDeliveryDecisionDto) {
    const { tenantId } = actor;
    if (actor.role !== MembershipRole.CLIENT) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'only_the_client_decides' });
    }
    const note = dto.note?.trim();
    if (dto.decision === 'REQUEST_CHANGES' && (!note || note.length < 2)) {
      throw new BadRequestException({ code: 'NOTE_REQUIRED', reason: 'Describe the changes you need.' });
    }
    const scope = await this.clientScope.resolve(tenantId, actor.userId, actor.role);
    const delivery = await this.prisma.approvalRequest.findFirst({
      where: { id, tenantId, clientVisible: true, clientScopeKey: scope ?? '__none__' },
      select: {
        id: true, requestedByUserId: true,
        fileAsset: { select: { id: true, name: true, task: { select: { assignedToUserId: true } } } },
      },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');

    const status = dto.decision === 'APPROVE' ? ApprovalStatus.APPROVED : ApprovalStatus.CHANGES_REQUESTED;
    const decision = await this.prisma.$transaction(async (tx) => {
      // Only a delivery that is still under review can be answered, once.
      const moved = await tx.approvalRequest.updateMany({
        where: { id, tenantId, status: ApprovalStatus.REQUESTED },
        data: { status },
      });
      if (moved.count !== 1) throw new ConflictException({ code: 'DELIVERY_ALREADY_ANSWERED', reason: 'This delivery has already been answered.' });
      return tx.approvalDecision.create({
        data: { tenantId, approvalRequestId: id, decision: dto.decision, note, decidedByUserId: actor.userId },
        select: { id: true },
      });
    });

    // Straight to the person responsible for the work (the task's assignee,
    // else whoever sent it); no manager step in between.
    const responsible = delivery.fileAsset?.task?.assignedToUserId ?? delivery.requestedByUserId;
    await this.notifications.notify({
      tenantId,
      recipientUserIds: responsible ? [responsible] : [],
      audience: 'INTERNAL',
      actorUserId: actor.userId,
      dedupeKey: `delivery.decided:${decision.id}`,
      title: dto.decision === 'APPROVE' ? 'Client approved the delivery' : 'Client requested changes',
      body: delivery.fileAsset?.name ?? undefined,
      resourceType: 'file',
      resourceId: delivery.fileAsset?.id,
    });
    await this.record(actor, dto.decision === 'APPROVE' ? 'delivery.approved' : 'delivery.changes_requested', id, {});
    return { id, status };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async clientMemberIds(tenantId: string, clientScopeKey: string): Promise<string[]> {
    const rows = await this.prisma.tenantMembership.findMany({
      where: { tenantId, role: MembershipRole.CLIENT, status: 'ACTIVE', clientScopeKey },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  /** Which of these users are CLIENT members of the tenant: their words are shown as the client's. */
  private async clientUserIds(tenantId: string, ids: (string | null)[]): Promise<Set<string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (!unique.length) return new Set();
    const rows = await this.prisma.tenantMembership.findMany({
      where: { tenantId, userId: { in: unique }, role: MembershipRole.CLIENT },
      select: { userId: true },
    });
    return new Set(rows.map((r) => r.userId));
  }

  private async record(actor: Actor, action: string, resourceId: string, payload: Record<string, unknown>) {
    await this.audit.createAuditEvent({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      actorRole: actor.role as MembershipRole,
      resourceType: 'ApprovalRequest',
      resourceId,
      action,
      permissionResult: AuditPermissionResult.ALLOWED,
      outcome: AuditOutcome.SUCCESS,
      payload,
    }).catch((err: unknown) => this.logger.error(`Could not record ${action} audit event`, err));
  }
}
