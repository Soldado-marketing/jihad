import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRateDto, RerateDto, UpdateRateDto } from './dto/rate.dto';
import { costCents, pickRate, ResolvedRate, scopeKeyFor } from '../finance/labour-cost';

type Db = Prisma.TransactionClient | PrismaService;

const RATE_SELECT = {
  id: true,
  scope: true,
  userId: true,
  role: true,
  rateCents: true,
  currency: true,
  validFrom: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, displayName: true } },
} satisfies Prisma.RateSelect;

export const RERATE_LIMIT = 1000;

function parseDay(value: string, field: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException({ code: 'INVALID_DATE', field, message: `${field} must be a real date as YYYY-MM-DD.` });
  }
  return d;
}

/**
 * Rates and their resolution (MAOS-T73, ADR-018 §2-§5).
 *
 * - Rates are OWNER-only data: every route needs the sensitive RATE
 *   permission AND an ACTIVE OWNER membership in the database (a custom
 *   grant cannot open them, the same rule as project budgets).
 * - A rate is effective from validFrom; there is one per workspace, target
 *   (member, role default, tenant default) and day (T71 unique key).
 *   Changing or deleting a rate never touches entries already frozen.
 * - resolve() is used by time entries on creation: member -> role -> tenant,
 *   newest validFrom on or before the entry day; no source = unrated.
 * - rerate() is the explicit OWNER action that re-resolves existing entries
 *   for a date range, writing one audit event per changed entry. BILLED
 *   entries are never re-rated (billing history).
 */
@Injectable()
export class RatesService {
  private readonly logger = new Logger(RatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, actorId: string) {
    await this.requireOwner(tenantId, actorId);
    const rows = await this.prisma.rate.findMany({ where: { tenantId }, orderBy: [{ scope: 'asc' }, { validFrom: 'desc' }], take: 1000, select: RATE_SELECT });
    return rows.map((r) => ({ ...r, validFrom: r.validFrom.toISOString().slice(0, 10) }));
  }

  async create(tenantId: string, actorId: string, dto: CreateRateDto) {
    await this.requireOwner(tenantId, actorId);
    const userId = dto.scope === 'MEMBER' ? dto.userId! : null;
    const role = dto.scope === 'ROLE' ? dto.role! : null;
    if ((dto.scope !== 'MEMBER' && dto.userId) || (dto.scope !== 'ROLE' && dto.role)) {
      throw new BadRequestException({ code: 'RATE_SCOPE_INVALID', message: 'Send userId only for a MEMBER rate and role only for a ROLE rate.' });
    }
    if (userId) await this.checkMember(tenantId, userId);
    let id: string;
    try {
      ({ id } = await this.prisma.rate.create({
        data: {
          tenantId,
          scope: dto.scope,
          scopeKey: scopeKeyFor(dto.scope, userId, role),
          userId,
          role,
          rateCents: dto.rateCents,
          currency: dto.currency ?? 'EUR',
          validFrom: parseDay(dto.validFrom, 'validFrom'),
          createdByUserId: actorId,
        },
        select: { id: true },
      }));
    } catch (err) {
      if ((err as { code?: unknown } | null)?.code === 'P2002') {
        throw new ConflictException({ code: 'RATE_EXISTS', message: 'A rate for this target already starts on this day. Change that rate or pick another day.' });
      }
      throw err;
    }
    await this.record(tenantId, actorId, 'rate.created', 'rate', id, { scope: dto.scope, validFrom: dto.validFrom });
    return this.get(tenantId, id);
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateRateDto) {
    await this.requireOwner(tenantId, actorId);
    const before = await this.get(tenantId, id);
    await this.prisma.rate.updateMany({ where: { id, tenantId }, data: { rateCents: dto.rateCents } });
    await this.record(tenantId, actorId, 'rate.updated', 'rate', id, { from: before.rateCents, to: dto.rateCents });
    return this.get(tenantId, id);
  }

  async remove(tenantId: string, actorId: string, id: string) {
    await this.requireOwner(tenantId, actorId);
    await this.get(tenantId, id);
    await this.prisma.rate.deleteMany({ where: { id, tenantId } });
    await this.record(tenantId, actorId, 'rate.deleted', 'rate', id);
  }

  /** The rate to freeze onto an entry of this member on this day, or null (unrated). */
  async resolve(tenantId: string, userId: string, day: Date, db: Db = this.prisma): Promise<ResolvedRate | null> {
    const membership = await db.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId, userId } }, select: { role: true } });
    if (!membership) return null;
    const keys = [scopeKeyFor('MEMBER', userId), scopeKeyFor('ROLE', null, membership.role), 'TENANT'];
    const candidates = await db.rate.findMany({
      where: { tenantId, scopeKey: { in: keys }, validFrom: { lte: day } },
      select: { scope: true, scopeKey: true, rateCents: true, currency: true, validFrom: true },
    });
    return pickRate(candidates, day, userId, membership.role);
  }

  /** Explicit OWNER re-rating of entries dated from..to (inclusive), optionally of one member. */
  async rerate(tenantId: string, actorId: string, dto: RerateDto) {
    await this.requireOwner(tenantId, actorId);
    const from = parseDay(dto.from, 'from');
    const to = parseDay(dto.to, 'to');
    if (to < from) throw new BadRequestException({ code: 'INVALID_RANGE', message: 'to must not be before from.' });
    const where: Prisma.TimeEntryWhereInput = { tenantId, date: { gte: from, lte: to }, status: { not: 'BILLED' }, ...(dto.userId && { userId: dto.userId }) };
    const count = await this.prisma.timeEntry.count({ where });
    if (count > RERATE_LIMIT) {
      throw new BadRequestException({ code: 'RERATE_TOO_MANY', message: `At most ${RERATE_LIMIT} entries per re-rating; choose a shorter range.` });
    }
    const changes = await this.prisma.$transaction(
      async (tx) => {
        const entries = await tx.timeEntry.findMany({ where, select: { id: true, userId: true, date: true, minutes: true, rateCents: true, rateSource: true, currency: true, costCents: true } });
        const changed: { id: string; before: unknown; after: unknown }[] = [];
        for (const e of entries) {
          const rate = await this.resolve(tenantId, e.userId, e.date, tx);
          const next = rate
            ? { rateCents: rate.rateCents, rateSource: rate.rateSource, currency: rate.currency, costCents: costCents(e.minutes, rate.rateCents) }
            : { rateCents: null, rateSource: null, currency: null, costCents: null };
          const same = next.rateCents === e.rateCents && next.rateSource === e.rateSource && next.currency === e.currency && next.costCents === e.costCents;
          if (same) continue;
          await tx.timeEntry.updateMany({ where: { id: e.id, tenantId }, data: next });
          changed.push({ id: e.id, before: { rateCents: e.rateCents, rateSource: e.rateSource, costCents: e.costCents }, after: { rateCents: next.rateCents, rateSource: next.rateSource, costCents: next.costCents } });
        }
        return { checked: entries.length, changed };
      },
      { timeout: 60_000 },
    );
    for (const c of changes.changed) {
      await this.record(tenantId, actorId, 'time_entry.rerated', 'time-entry', c.id, { before: c.before, after: c.after });
    }
    return { checked: changes.checked, changed: changes.changed.length };
  }

  // ---------------------------------------------------------------- helpers

  private async get(tenantId: string, id: string) {
    const r = await this.prisma.rate.findFirst({ where: { id, tenantId }, select: RATE_SELECT });
    if (!r) throw new NotFoundException('Rate not found');
    return { ...r, validFrom: r.validFrom.toISOString().slice(0, 10) };
  }

  /** From the database membership, never the token (ADR-018 decision: rates set by the OWNER). */
  private async requireOwner(tenantId: string, userId: string) {
    const m = await this.prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId, userId } }, select: { role: true, status: true } });
    if (m?.role !== 'OWNER' || m.status !== 'ACTIVE') throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'rates_owner_only' });
  }

  private async checkMember(tenantId: string, userId: string) {
    const m = await this.prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId, userId } }, select: { role: true, status: true } });
    if (!m || m.status !== 'ACTIVE' || m.role === 'CLIENT') {
      throw new BadRequestException({ code: 'INVALID_REFERENCE', field: 'userId', message: 'userId must be an active team member of this workspace.' });
    }
  }

  private async record(tenantId: string, actorId: string, action: string, resourceType: string, resourceId: string, payload?: Record<string, unknown>) {
    try {
      await this.audit.createAuditEvent({
        tenantId,
        actorId,
        resourceType,
        resourceId,
        action,
        permissionResult: AuditPermissionResult.ALLOWED,
        outcome: AuditOutcome.SUCCESS,
        payload,
      });
    } catch {
      this.logger.warn(`audit_write_failed action=${action}`);
    }
  }
}
