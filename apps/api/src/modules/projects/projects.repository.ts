import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.project.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { tasks: true } },
      },
    });
  }

  create(tenantId: string, actorId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        tasks: {
          select: { id: true, title: true, status: true, priority: true, dueAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { tasks: true } },
      },
    });
  }

  update(tenantId: string, id: string, dto: UpdateProjectDto) {
    return this.prisma.project.update({
      where: { id, tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  delete(tenantId: string, id: string) {
    return this.prisma.project.delete({ where: { id, tenantId } });
  }
}
