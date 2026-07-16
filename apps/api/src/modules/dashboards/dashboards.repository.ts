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

  async getClientSummary(tenantId: string) {
    const [projects, tasks, invoices] = await Promise.all([
      this.prisma.project.count({ where: { tenantId } }),
      this.prisma.task.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId } }),
    ]);
    return { projects, tasks, invoices };
  }
}