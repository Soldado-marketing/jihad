import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listDefinitions(tenantId: string) {
    return this.prisma.reportDefinition.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, description: true, visibility: true,
        createdAt: true, updatedAt: true,
        _count: { select: { runs: true } },
      },
    });
  }

  getDefinitionById(tenantId: string, id: string) {
    return this.prisma.reportDefinition.findFirst({
      where: { id, tenantId },
      include: {
        runs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
  }

  createDefinition(tenantId: string, actorId: string, name: string) {
    return this.prisma.reportDefinition.create({
      data: { tenantId, name, createdByUserId: actorId },
    });
  }

  async runReport(tenantId: string, definitionId: string, actorId: string) {
    const run = await this.prisma.reportRun.create({
      data: {
        tenantId,
        reportDefinitionId: definitionId,
        status: 'RUNNING',
        createdByUserId: actorId,
      },
    });
    return run;
  }
}
