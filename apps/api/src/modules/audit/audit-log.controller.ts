import { BadRequestException, Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE = 50;
const OUTCOMES = ['SUCCESS', 'FAILURE', 'BLOCKED', 'PARTIAL'];
const MEMBER_HISTORY_LIMIT = 100;
/** What a member's access history is made of (plan row E02). */
const MEMBER_ACTIONS = [
  'role.assigned',
  'permissions.assigned',
  'scope.assigned',
  'role.changed',
  'user.suspended',
  'user.reactivated',
  'membership.grant_updated',
  'membership.removed',
];

/**
 * Tenant audit log for the Audit UI (MAOS-T132). OWNER only: `sensitive`
 * denies every other role. Newest first with a cursor; optional filters.
 * Returns the already-redacted payload (AuditRedactor) but never session or
 * device identifiers.
 */
@Controller('audit-events')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.AUDIT_EVENT, sensitive: true })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('actorId') actorId?: string,
    @Query('outcome') outcome?: string,
    @Query('before') before?: string,
  ) {
    // Cursor "<ISO timestamp>|<id>": events sharing a timestamp are ordered
    // by id, so a page boundary never skips or repeats one.
    let cursor: { at: Date; id: string } | undefined;
    if (before) {
      const [at, id] = before.split('|');
      const date = new Date(at);
      if (!id || Number.isNaN(date.getTime())) throw new BadRequestException({ code: 'INVALID_CURSOR' });
      cursor = { at: date, id };
    }
    if (outcome && !OUTCOMES.includes(outcome)) {
      throw new BadRequestException({ code: 'INVALID_OUTCOME' });
    }
    const rows = await this.prisma.auditEvent.findMany({
      where: {
        tenantId: user.tenantId,
        ...(action ? { action: { startsWith: action.slice(0, 80) } } : {}),
        ...(resourceType ? { resourceType: resourceType.slice(0, 80) } : {}),
        ...(actorId ? { actorId } : {}),
        ...(outcome ? { outcome: outcome as 'SUCCESS' } : {}),
        ...(cursor
          ? { OR: [{ createdAt: { lt: cursor.at } }, { createdAt: cursor.at, id: { lt: cursor.id } }] }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        action: true,
        outcome: true,
        resourceType: true,
        resourceId: true,
        permissionResult: true,
        failureCategory: true,
        redactedPayload: true,
        createdAt: true,
        actor: { select: { id: true, displayName: true } },
      },
    });
    const items = rows.slice(0, PAGE_SIZE);
    return {
      items,
      nextBefore:
        rows.length > PAGE_SIZE ? `${items[items.length - 1].createdAt.toISOString()}|${items[items.length - 1].id}` : null,
    };
  }

  /**
   * One member's access history (plan row E02): role and scope assignments,
   * role changes, permission grants, suspension, reactivation and removal,
   * newest first. Membership events were recorded under two ids — the user id
   * (role, scope, suspension) and the membership id (grants, removal) — so
   * both are looked up here and the page never needs to know. OWNER only, as
   * the log itself; a user outside this company is "not found".
   */
  @Get('member/:userId')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.AUDIT_EVENT, sensitive: true })
  async member(@CurrentUser() user: JwtPayload, @Param('userId') userId: string) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: user.tenantId, userId } },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('Member not found');
    const rows = await this.prisma.auditEvent.findMany({
      where: {
        tenantId: user.tenantId,
        resourceType: { in: ['TenantMembership', 'User'] },
        resourceId: { in: [userId, membership.id] },
        action: { in: MEMBER_ACTIONS },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MEMBER_HISTORY_LIMIT,
      select: {
        id: true,
        action: true,
        outcome: true,
        redactedPayload: true,
        createdAt: true,
        actor: { select: { id: true, displayName: true } },
      },
    });
    return {
      items: rows.map(({ redactedPayload, ...row }) => ({ ...row, details: redactedPayload ?? null })),
      limit: MEMBER_HISTORY_LIMIT,
    };
  }
}
