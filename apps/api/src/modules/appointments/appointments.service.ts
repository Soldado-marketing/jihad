import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ClientScopeService } from '../memberships/client-scope.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { appointmentDescription, appointmentWhen, parseAppointmentDescription, SHOOTING_LABEL } from './appointment-format';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

type Actor = { tenantId: string; userId: string; role: string };
const STAFF: string[] = [MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.EMPLOYEE];
const CHANGE_ACTIONS = ['appointment.scheduled', 'appointment.updated', 'appointment.cancelled'];
const SEEN = 'appointment.seen';
const isShooting = { labels: { some: { label: { name: SHOOTING_LABEL } } } } satisfies Prisma.TaskWhereInput;
const SELECT = {
  id: true, title: true, description: true, dueAt: true, status: true, clientScopeKey: true, updatedAt: true,
  project: { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect;

/**
 * Shooting appointments (owner decision 2026-11-02): staff schedule a session
 * for a client's project; the client sees date, time, location and what to
 * prepare, and confirms they have seen it. Built on Task + the "Shooting"
 * label (appointment-format.ts); "seen" and every change are audit events, so
 * no new table is needed. The client side never sees who is on the crew.
 */
@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientScope: ClientScopeService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  // ── Staff ──────────────────────────────────────────────────────────────────

  async list(actor: Actor, projectId?: string) {
    this.requireStaff(actor);
    const rows = await this.prisma.task.findMany({
      where: { tenantId: actor.tenantId, ...isShooting, ...(projectId ? { projectId } : {}) },
      orderBy: { dueAt: 'asc' },
      select: SELECT,
    });
    const seen = await this.seenState(actor.tenantId, rows.map((r) => r.id));
    return rows.map((r) => ({ ...this.view(r), seenAt: seen.get(r.id)?.seenAt ?? null, seenCurrent: seen.get(r.id)?.current ?? false }));
  }

  async create(actor: Actor, dto: CreateAppointmentDto) {
    this.requireStaff(actor);
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId: actor.tenantId },
      select: { id: true, clientScopeKey: true, clientVisible: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (!project.clientScopeKey || !project.clientVisible) {
      throw new ConflictException({ code: 'PROJECT_NOT_SHARED', reason: 'Choose a project that belongs to a customer and is shared with the client.' });
    }
    const label = await this.prisma.label.upsert({
      where: { tenantId_name: { tenantId: actor.tenantId, name: SHOOTING_LABEL } },
      create: { tenantId: actor.tenantId, name: SHOOTING_LABEL, color: '#0b6fa4' },
      update: {},
      select: { id: true },
    });
    const task = await this.prisma.task.create({
      data: {
        tenantId: actor.tenantId, projectId: project.id, title: dto.title?.trim() || 'Shooting',
        description: appointmentDescription(dto.location, dto.preparation), dueAt: new Date(dto.startsAt),
        clientVisible: true, clientScopeKey: project.clientScopeKey, priority: 'HIGH',
        labels: { create: { tenantId: actor.tenantId, labelId: label.id } },
      },
      select: SELECT,
    });
    await this.changed(actor, task, 'appointment.scheduled', 'Shooting appointment scheduled');
    return this.view(task);
  }

  async update(actor: Actor, id: string, dto: UpdateAppointmentDto) {
    this.requireStaff(actor);
    const current = await this.find(actor.tenantId, id);
    if (current.status === 'ARCHIVED') throw new ConflictException({ code: 'APPOINTMENT_CANCELLED', reason: 'A cancelled appointment cannot be changed.' });
    const before = parseAppointmentDescription(current.description);
    const task = await this.prisma.task.update({
      where: { id: current.id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.startsAt !== undefined && { dueAt: new Date(dto.startsAt) }),
        ...((dto.location !== undefined || dto.preparation !== undefined) && {
          description: appointmentDescription(dto.location ?? before.location, dto.preparation ?? before.preparation),
        }),
      },
      select: SELECT,
    });
    await this.changed(actor, task, 'appointment.updated', 'Shooting appointment changed');
    return this.view(task);
  }

  async cancel(actor: Actor, id: string) {
    this.requireStaff(actor);
    const current = await this.find(actor.tenantId, id);
    if (current.status === 'ARCHIVED') return this.view(current); // already cancelled: tell the client once
    const task = await this.prisma.task.update({ where: { id: current.id }, data: { status: 'ARCHIVED' }, select: SELECT });
    await this.changed(actor, task, 'appointment.cancelled', 'Shooting appointment cancelled');
    return this.view(task);
  }

  // ── Client ─────────────────────────────────────────────────────────────────

  async listForClient(actor: Actor) {
    const scope = await this.clientScope.resolve(actor.tenantId, actor.userId, actor.role);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.task.findMany({
      where: { tenantId: actor.tenantId, ...isShooting, clientVisible: true, dueAt: { gte: since }, ...(scope === null ? {} : { clientScopeKey: scope }) },
      orderBy: { dueAt: 'asc' },
      select: SELECT,
    });
    const seen = await this.seenState(actor.tenantId, rows.map((r) => r.id), actor.userId);
    return rows.map((r) => ({ ...this.view(r), seenAt: seen.get(r.id)?.seenAt ?? null, seenCurrent: seen.get(r.id)?.current ?? false }));
  }

  /** "I've seen this appointment": recorded once per change, by the client themself. */
  async markSeen(actor: Actor, id: string) {
    if (actor.role !== MembershipRole.CLIENT) throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'only_the_client_confirms' });
    const scope = await this.clientScope.resolve(actor.tenantId, actor.userId, actor.role);
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId: actor.tenantId, ...isShooting, clientVisible: true, clientScopeKey: scope ?? '__none__' },
      select: { id: true, status: true },
    });
    if (!task) throw new NotFoundException('Appointment not found');
    const state = (await this.seenState(actor.tenantId, [id], actor.userId)).get(id);
    // The confirmation is the record itself, so a failure must not look like success.
    if (!state?.current) await this.record(actor, SEEN, id, {}, true);
    return { id, seen: true };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private requireStaff(actor: Actor) {
    if (!STAFF.includes(actor.role)) throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'staff_only' });
  }

  private async find(tenantId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId, ...isShooting }, select: SELECT });
    if (!task) throw new NotFoundException('Appointment not found');
    return task;
  }

  /** The client-safe shape: no assignee, no crew, no internal ids beyond the record and its project. */
  private view(t: Prisma.TaskGetPayload<{ select: typeof SELECT }>) {
    const { location, preparation } = parseAppointmentDescription(t.description);
    return {
      id: t.id, title: t.title, startsAt: t.dueAt, location, preparation,
      status: t.status === 'ARCHIVED' ? 'CANCELLED' as const : 'SCHEDULED' as const,
      project: t.project,
    };
  }

  /** Last "seen" per appointment and whether it came after the last change. */
  private async seenState(tenantId: string, ids: string[], userId?: string) {
    const state = new Map<string, { seenAt: Date; current: boolean }>();
    if (!ids.length) return state;
    const events = await this.prisma.auditEvent.findMany({
      where: { tenantId, resourceType: 'Appointment', resourceId: { in: ids }, action: { in: [SEEN, ...CHANGE_ACTIONS] } },
      orderBy: { createdAt: 'asc' },
      select: { resourceId: true, action: true, actorId: true, createdAt: true },
    });
    const lastChange = new Map<string, Date>();
    for (const e of events) {
      if (!e.resourceId) continue;
      if (e.action === SEEN) {
        if (!userId || e.actorId === userId) state.set(e.resourceId, { seenAt: e.createdAt, current: true });
      } else lastChange.set(e.resourceId, e.createdAt);
    }
    for (const [id, s] of state) s.current = s.seenAt >= (lastChange.get(id) ?? new Date(0));
    return state;
  }

  private async changed(actor: Actor, task: Prisma.TaskGetPayload<{ select: typeof SELECT }>, action: string, title: string) {
    await this.record(actor, action, task.id, { startsAt: task.dueAt?.toISOString() ?? null });
    const clients = task.clientScopeKey
      ? (await this.prisma.tenantMembership.findMany({
          where: { tenantId: actor.tenantId, role: MembershipRole.CLIENT, status: 'ACTIVE', clientScopeKey: task.clientScopeKey },
          select: { userId: true },
        })).map((m) => m.userId)
      : [];
    const { location } = parseAppointmentDescription(task.description);
    await this.notifications.notify({
      tenantId: actor.tenantId,
      recipientUserIds: clients,
      audience: 'DIRECT',
      actorUserId: actor.userId,
      dedupeKey: `${action}:${task.id}:${Date.now()}`,
      title,
      body: `${task.title} · ${task.dueAt ? appointmentWhen(task.dueAt) : ''}${location ? ` · ${location}` : ''}`.slice(0, 240),
      resourceType: 'appointment',
      resourceId: task.id,
    });
  }

  private async record(actor: Actor, action: string, id: string, payload: Record<string, unknown>, strict = false) {
    const write = this.audit.createAuditEvent({
      tenantId: actor.tenantId, actorId: actor.userId, actorRole: actor.role as MembershipRole,
      resourceType: 'Appointment', resourceId: id, action,
      permissionResult: AuditPermissionResult.ALLOWED, outcome: AuditOutcome.SUCCESS, payload,
    });
    if (strict) await write;
    else await write.catch((err: unknown) => this.logger.error(`Could not record ${action}`, err));
  }
}
