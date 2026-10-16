import { Injectable } from '@nestjs/common';
import { Prisma, TimeEntryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Every field a time entry read returns; rate and cost fields are removed for non-OWNERs by the service. */
export const TIME_ENTRY_SELECT = {
  id: true,
  date: true,
  minutes: true,
  billable: true,
  note: true,
  status: true,
  projectId: true,
  taskId: true,
  customerId: true,
  rateCents: true,
  rateSource: true,
  currency: true,
  costCents: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, displayName: true } },
  project: { select: { id: true, name: true, projectNumber: true } },
  task: { select: { id: true, title: true } },
} satisfies Prisma.TimeEntrySelect;

export type TimeEntryRow = Prisma.TimeEntryGetPayload<{ select: typeof TIME_ENTRY_SELECT }>;

@Injectable()
export class TimeEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, where: Prisma.TimeEntryWhereInput, take: number) {
    return this.prisma.timeEntry.findMany({
      where: { tenantId, AND: [where] },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take,
      select: TIME_ENTRY_SELECT,
    });
  }

  get(tenantId: string, id: string, where: Prisma.TimeEntryWhereInput = {}) {
    return this.prisma.timeEntry.findFirst({ where: { id, tenantId, AND: [where] }, select: TIME_ENTRY_SELECT });
  }

  create(tenantId: string, data: Omit<Prisma.TimeEntryUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.timeEntry.create({ data: { ...data, tenantId }, select: { id: true } });
  }

  /** Changes the entry only while it is in one of `from`; returns how many rows changed (0 = state moved on). */
  async updateIfStatus(tenantId: string, id: string, userId: string | null, from: TimeEntryStatus[], data: Prisma.TimeEntryUncheckedUpdateManyInput) {
    const { count } = await this.prisma.timeEntry.updateMany({
      where: { id, tenantId, status: { in: from }, ...(userId && { userId }) },
      data,
    });
    return count;
  }

  async deleteIfStatus(tenantId: string, id: string, userId: string, from: TimeEntryStatus[]) {
    const { count } = await this.prisma.timeEntry.deleteMany({ where: { id, tenantId, userId, status: { in: from } } });
    return count;
  }

  project(tenantId: string, id: string) {
    return this.prisma.project.findFirst({ where: { id, tenantId }, select: { id: true, customerId: true } });
  }

  task(tenantId: string, id: string) {
    return this.prisma.task.findFirst({ where: { id, tenantId }, select: { id: true, projectId: true, assignedToUserId: true } });
  }

  membership(tenantId: string, userId: string) {
    return this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { role: true, status: true },
    });
  }
}
