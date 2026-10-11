import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspaceSummary(tenantId: string) {
    const [projects, tasks, leads, opps, meetings, followUps, notes, files, approvals, voiceNotes, invoices] = await Promise.all([
      this.prisma.project.count({ where: { tenantId } }),
      this.prisma.task.count({ where: { tenantId } }),
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.opportunity.count({ where: { tenantId } }),
      this.prisma.meeting.count({ where: { tenantId } }),
      this.prisma.followUp.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.internalNote.count({ where: { tenantId } }),
      this.prisma.fileAsset.count({ where: { tenantId } }),
      this.prisma.approvalRequest.count({ where: { tenantId, status: 'REQUESTED' } }),
      this.prisma.voiceNote.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId } }),
    ]);

    return {
      projectTasks: { projects, tasks },
      crm: { leads, opportunities: opps, meetings, pendingFollowUps: followUps },
      collaboration: { notes, files, pendingApprovals: approvals },
      voiceNotes,
      invoices,
    };
  }

  /** Same shape as getWorkspaceSummary, counting only the given scopes. */
  async getAssignedWorkSummary(
    tenantId: string,
    where: { project: Prisma.ProjectWhereInput; task: Prisma.TaskWhereInput; file: Prisma.FileAssetWhereInput },
  ) {
    const [projects, tasks, files] = await Promise.all([
      this.prisma.project.count({ where: { tenantId, AND: [where.project] } }),
      this.prisma.task.count({ where: { tenantId, AND: [where.task] } }),
      this.prisma.fileAsset.count({ where: { tenantId, AND: [where.file] } }),
    ]);
    return {
      projectTasks: { projects, tasks },
      crm: { leads: 0, opportunities: 0, meetings: 0, pendingFollowUps: 0 },
      collaboration: { notes: 0, files, pendingApprovals: 0 },
      voiceNotes: 0,
      invoices: 0,
    };
  }

  /**
   * clientScopeKey null = internal role: tenant-wide counts (owner preview).
   * Otherwise the counts match exactly what that client's portal lists show:
   * client-visible rows in its scope, and invoices that are not DRAFT.
   */
  async getClientSummary(tenantId: string, clientScopeKey: string | null) {
    if (clientScopeKey === null) {
      const [projects, tasks, invoices] = await Promise.all([
        this.prisma.project.count({ where: { tenantId } }),
        this.prisma.task.count({ where: { tenantId } }),
        this.prisma.invoice.count({ where: { tenantId } }),
      ]);
      return { projects, tasks, invoices };
    }
    const visible = { tenantId, clientVisible: true, clientScopeKey };
    const [projects, tasks, invoices] = await Promise.all([
      this.prisma.project.count({ where: visible }),
      this.prisma.task.count({ where: visible }),
      this.prisma.invoice.count({ where: { ...visible, status: { not: 'DRAFT' } } }),
    ]);
    return { projects, tasks, invoices };
  }
}