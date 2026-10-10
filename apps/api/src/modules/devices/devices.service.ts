import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller's own devices in the current tenant, newest first (MAOS-T38). */
  async listOwn(tenantId: string, userId: string) {
    const items = await this.prisma.device.findMany({
      where: { tenantId, userId },
      orderBy: { lastSeenAt: 'desc' },
      take: 50,
      select: { id: true, status: true, userAgent: true, firstSeenAt: true, lastSeenAt: true },
    });
    return { items };
  }
}
