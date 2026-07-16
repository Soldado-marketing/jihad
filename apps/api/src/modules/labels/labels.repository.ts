import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Label CRUD ──────────────────────────────────────────────────────────

  list(tenantId: string) {
    return this.prisma.label.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true, createdAt: true, updatedAt: true },
    });
  }

  async create(tenantId: string, dto: CreateLabelDto) {
    const exists = await this.prisma.label.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });
    if (exists) throw new ConflictException(`Label "${dto.name}" already exists`);

    return this.prisma.label.create({
      data: {
        tenantId,
        name: dto.name,
        ...(dto.color ? { color: dto.color } : {}),
      },
      select: { id: true, name: true, color: true, createdAt: true, updatedAt: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateLabelDto) {
    const label = await this.prisma.label.findFirst({ where: { id, tenantId } });
    if (!label) throw new NotFoundException('Label not found');

    // Uniqueness check only when name is changing
    if (dto.name && dto.name !== label.name) {
      const conflict = await this.prisma.label.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (conflict) throw new ConflictException(`Label "${dto.name}" already exists`);
    }

    return this.prisma.label.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      select: { id: true, name: true, color: true, createdAt: true, updatedAt: true },
    });
  }

  async delete(tenantId: string, id: string) {
    const label = await this.prisma.label.findFirst({ where: { id, tenantId } });
    if (!label) throw new NotFoundException('Label not found');
    await this.prisma.label.delete({ where: { id } });
  }

  // ─── Task-label assignment ────────────────────────────────────────────────

  /**
   * Assign a label to a task.
   * Verifies BOTH the task and the label belong to the authenticated tenant
   * before writing — cross-tenant linking is structurally impossible.
   * The operation is idempotent (upsert).
   */
  async assignLabel(tenantId: string, taskId: string, labelId: string) {
    const [task, label] = await Promise.all([
      this.prisma.task.findFirst({ where: { id: taskId, tenantId } }),
      this.prisma.label.findFirst({ where: { id: labelId, tenantId } }),
    ]);
    if (!task) throw new NotFoundException('Task not found');
    if (!label) throw new NotFoundException('Label not found');

    return this.prisma.taskLabel.upsert({
      where: { taskId_labelId: { taskId, labelId } },
      create: { taskId, labelId, tenantId },
      update: {},
    });
  }

  /**
   * Remove a label from a task.
   * Verifies the task and label both belong to the tenant before deleting.
   * Returns silently if the assignment did not exist.
   */
  async removeLabel(tenantId: string, taskId: string, labelId: string) {
    const [task, label] = await Promise.all([
      this.prisma.task.findFirst({ where: { id: taskId, tenantId } }),
      this.prisma.label.findFirst({ where: { id: labelId, tenantId } }),
    ]);
    if (!task) throw new NotFoundException('Task not found');
    if (!label) throw new NotFoundException('Label not found');

    await this.prisma.taskLabel.deleteMany({
      where: { taskId, labelId, tenantId },
    });
  }
}
