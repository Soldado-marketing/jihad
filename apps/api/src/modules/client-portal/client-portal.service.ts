import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientPortalService {
  constructor(private readonly prisma: PrismaService) {}

  listProjects(tenantId: string, actorId: string) {
    return this.prisma.project.findMany({
      where: { tenantId, clientVisible: true },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  getProject(tenantId: string, actorId: string, id: string) {
    return this.prisma.project.findFirst({
      where: { id, tenantId, clientVisible: true },
      select: { id: true, name: true, status: true, description: true },
    });
  }

  listTasks(tenantId: string, actorId: string) {
    return this.prisma.task.findMany({
      where: { tenantId, clientVisible: true },
      select: { id: true, title: true, status: true, projectId: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  getTask(tenantId: string, actorId: string, id: string) {
    return this.prisma.task.findFirst({
      where: { id, tenantId, clientVisible: true },
      select: { id: true, title: true, status: true, projectId: true, description: true },
    });
  }
}
