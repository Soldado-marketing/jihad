import { Injectable } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalDecisionDto } from './dto/create-approval-decision.dto';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';

type DecisionKey = CreateApprovalDecisionDto['decision'];

const DECISION_TO_STATUS: Record<DecisionKey, ApprovalStatus> = {
  APPROVE: ApprovalStatus.APPROVED,
  REJECT: ApprovalStatus.REJECTED,
  REQUEST_CHANGES: ApprovalStatus.CHANGES_REQUESTED,
  CANCEL: ApprovalStatus.CANCELED,
};

@Injectable()
export class ApprovalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, status: true, dueAt: true, createdAt: true, updatedAt: true,
        requestedByUserId: true,
        fileAsset: { select: { id: true, name: true } },
        decisions: { select: { id: true, decision: true, createdAt: true } },
      },
    });
  }

  create(tenantId: string, actorId: string, dto: CreateApprovalRequestDto) {
    return this.prisma.approvalRequest.create({
      data: {
        tenantId,
        title: dto.title,
        requestedByUserId: actorId,
        fileAssetId: dto.fileAssetId,
        fileVersionId: dto.fileVersionId,
        clientScopeKey: dto.clientScopeKey,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.approvalRequest.findFirst({
      where: { id, tenantId },
      include: {
        fileAsset: { select: { id: true, name: true } },
        decisions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  createDecision(
    tenantId: string,
    actorId: string,
    approvalRequestId: string,
    dto: CreateApprovalDecisionDto,
  ) {
    const newStatus = DECISION_TO_STATUS[dto.decision];
    return this.prisma.$transaction(async (tx) => {
      const decision = await tx.approvalDecision.create({
        data: {
          tenantId,
          approvalRequestId,
          decision: dto.decision,
          note: dto.note,
          decidedByUserId: actorId,
        },
      });

      await tx.approvalRequest.update({
        where: { id: approvalRequestId, tenantId },
        data: { status: newStatus },
      });

      return decision;
    });
  }

  updateStatus(tenantId: string, id: string, status: ApprovalStatus) {
    return this.prisma.approvalRequest.update({
      where: { id, tenantId },
      data: { status },
    });
  }
}
