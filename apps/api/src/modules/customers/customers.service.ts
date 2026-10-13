import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { PrismaService } from '../prisma/prisma.service';
import { relinkCustomers } from './customer-link';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const SELECT = {
  id: true,
  clientScopeKey: true,
  name: true,
  status: true,
  industry: true,
  website: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  responsibleUser: { select: { id: true, displayName: true } },
  _count: { select: { projects: true, invoices: true, fileAssets: true } },
} satisfies Prisma.CustomerSelect;

/**
 * Customers (ADR-017, MAOS-T52). The business entity behind a clientScopeKey.
 * The key is set once at creation and never changes; records point at their
 * Customer only through the key (customerId is derived, never sent), so a
 * record can never name another client's Customer. Every query is
 * tenant-scoped; a foreign id answers 404.
 */
@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, status?: string) {
    return this.prisma.customer.findMany({
      where: { tenantId, ...(status ? { status: status as Prisma.EnumCustomerStatusFilter['equals'] } : {}) },
      orderBy: { name: 'asc' },
      take: 500,
      select: SELECT,
    });
  }

  async get(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId }, select: SELECT });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(tenantId: string, actorId: string, dto: CreateCustomerDto) {
    const responsibleUserId = await this.checkResponsible(tenantId, dto.responsibleUserId);
    let id: string;
    try {
      id = await this.prisma.$transaction(async (tx) => {
        const created = await tx.customer.create({
          data: {
            tenantId,
            clientScopeKey: dto.clientScopeKey,
            name: dto.name.trim(),
            industry: dto.industry,
            website: dto.website,
            notes: dto.notes,
            responsibleUserId,
          },
          select: { id: true },
        });
        // Records already carrying this key now belong to the new Customer.
        await relinkCustomers(tx, tenantId, dto.clientScopeKey);
        return created.id;
      });
    } catch (err: unknown) {
      if ((err as { code?: unknown } | null)?.code === 'P2002') {
        throw new ConflictException({ code: 'CUSTOMER_KEY_EXISTS', message: 'A customer with this client key already exists.' });
      }
      throw err;
    }
    await this.recordAudit(tenantId, actorId, 'customer.created', id);
    return this.get(tenantId, id);
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateCustomerDto) {
    const current = await this.prisma.customer.findFirst({ where: { id, tenantId }, select: { status: true } });
    if (!current) throw new NotFoundException('Customer not found');
    // Archiving (and un-archiving) is OWNER only (ADR-017 open question 4).
    const touchesArchive = dto.status !== undefined && dto.status !== current.status && (dto.status === 'ARCHIVED' || current.status === 'ARCHIVED');
    if (touchesArchive && !(await this.isOwner(tenantId, actorId))) {
      throw new ForbiddenException({ code: 'CUSTOMER_ARCHIVE_OWNER_ONLY', message: 'Only the owner can archive or restore a customer.' });
    }
    const responsibleUserId =
      dto.responsibleUserId === undefined ? undefined : await this.checkResponsible(tenantId, dto.responsibleUserId ?? undefined);

    await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(responsibleUserId !== undefined && { responsibleUserId }),
      },
    });
    await this.recordAudit(tenantId, actorId, 'customer.updated', id, { fields: Object.keys(dto) });
    return this.get(tenantId, id);
  }

  /** From the database membership, not the token's role claim. */
  private async isOwner(tenantId: string, userId: string): Promise<boolean> {
    const m = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { role: true, status: true },
    });
    return m?.role === 'OWNER' && m.status === 'ACTIVE';
  }

  /** The responsible person must be an ACTIVE internal member of this tenant. */
  private async checkResponsible(tenantId: string, userId: string | undefined): Promise<string | null> {
    if (!userId) return null;
    const m = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { role: true, status: true },
    });
    if (!m || m.status !== 'ACTIVE' || m.role === 'CLIENT') {
      throw new BadRequestException({ code: 'CUSTOMER_RESPONSIBLE_INVALID', message: 'The responsible person must be an active team member.' });
    }
    return userId;
  }

  private async recordAudit(tenantId: string, actorId: string, action: string, resourceId: string, payload?: Record<string, unknown>) {
    try {
      await this.audit.createAuditEvent({
        tenantId,
        actorId,
        resourceType: 'customer',
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
