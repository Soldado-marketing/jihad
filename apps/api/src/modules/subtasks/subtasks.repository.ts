import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';

@Injectable()
export class SubtasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForTask(tenantId: string, taskId: string) {
    return this.prisma.subtask.findMany({
      where: { task: { tenantId }, taskId },
      orderBy: [
        { sortOrder: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
    });
  }

  createForTask(tenantId: string, actorId: string, taskId: string, dto: CreateSubtaskDto) {
    return this.prisma.subtask.create({
      data: {
        tenantId,
        taskId,
        title: dto.title,
        assignedToUserId: dto.assignedToUserId,
        status: 'TODO',
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateSubtaskDto) {
    const existing = await this.prisma.subtask.findFirst({ where: { id, task: { tenantId } } });
    if (!existing) throw new NotFoundException('Subtask not found');
    return this.prisma.subtask.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.status && { status: dto.status }),
        ...(dto.assignedToUserId !== undefined && { assignedToUserId: dto.assignedToUserId }),
      },
    });
  }

  async delete(tenantId: string, id: string) {
    // Verify the subtask belongs to a task that belongs to this tenant
    const existing = await this.prisma.subtask.findFirst({
      where: { id, task: { tenantId } },
    });
    if (!existing) throw new NotFoundException('Subtask not found');
    return this.prisma.subtask.delete({ where: { id } });
  }
}
