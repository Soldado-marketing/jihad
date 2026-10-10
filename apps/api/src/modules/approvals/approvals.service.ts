import { Injectable, NotFoundException } from '@nestjs/common';
import { assertFileAssetInTenant, assertFileVersionInTenant } from '../../common/tenant/tenant-references';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalsRepository } from './approvals.repository';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { CreateApprovalDecisionDto } from './dto/create-approval-decision.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly repo: ApprovalsRepository,
    private readonly prisma: PrismaService,
  ) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  async create(tenantId: string, actorId: string, dto: CreateApprovalRequestDto) {
    await assertFileAssetInTenant(this.prisma, tenantId, dto.fileAssetId);
    await assertFileVersionInTenant(this.prisma, tenantId, dto.fileVersionId, dto.fileAssetId);
    return this.repo.create(tenantId, actorId, dto);
  }

  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    if (!item) throw new NotFoundException('Approval not found');
    return item;
  }

  async decide(tenantId: string, actorId: string, id: string, dto: CreateApprovalDecisionDto) {
    await this.get(tenantId, id);
    return this.repo.createDecision(tenantId, actorId, id, dto);
  }
}
