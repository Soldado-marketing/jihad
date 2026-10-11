import { Injectable } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalDecisionDto } from './dto/create-approval-decision.dto';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';

type DecisionKey = CreateApprovalDecisionDto['decision'];

/** Statuses that can still be decided; the others are final (MAOS-T108). */
export const OPEN_APPROVAL_STATUSES: ApprovalStatus[] = [ApprovalStatus.REQUESTED, ApprovalStatus.CHANGES_REQUESTED];

/** Thrown when a decision targets an approval that is no longer open. */
export class ApprovalClosedError extends Error {
  constructor(readonly status: string) {
    super('approval already decided');
  }
}

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
      // Status check and change in one conditional write: of two concurrent
      // deciders exactly one moves the approval out of an open status, and
      // the other is refused instead of recording a second decision.
      const moved = await tx.approvalRequest.updateMany({
        where: { id: approvalRequestId, tenantId, status: { in: OPEN_APPROVAL_STATUSES } },
        data: { status: newStatus },
      });
      if (moved.count !== 1) {
        const current = await tx.approvalRequest.findFirst({
          where: { id: approvalRequestId, tenantId },
          select: { status: true },
        });
        throw new ApprovalClosedError(current?.status ?? 'UNKNOWN');
      }

      const decision = await tx.approvalDecision.create({
        data: {
          tenantId,
          approvalRequestId,
          decision: dto.decision,
          note: dto.note,
          decidedByUserId: actorId,
        },
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
