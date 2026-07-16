import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Sprint 1A creates users only through invite acceptance. Public registration is intentionally unsupported.
  getInviteOnlyAccountCreationPolicy() {
    return {
      accountCreation: 'invite-only',
      publicRegistration: false,
    };
  }

  async getMe(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        createdAt: true,
        memberships: {
          where: { tenantId },
          select: {
            role: true,
            status: true,
            visibilityScope: true,
          },
          take: 1,
        },
      },
    });

    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });

    const membership = user.memberships[0] ?? null;

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      createdAt: user.createdAt,
      role: membership?.role ?? null,
      membershipStatus: membership?.status ?? null,
      visibilityScope: membership?.visibilityScope ?? null,
    };
  }

  listMembers(tenantId: string) {
    return this.prisma.tenantMembership.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        user: { select: { id: true, displayName: true, email: true } },
        role: true,
      },
      orderBy: { createdAt: 'asc' },
    }).then(rows => rows.map(r => ({ ...r.user, role: r.role })));
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException({ code: 'EMAIL_TAKEN' });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        updatedAt: true,
      },
    });

    return updated;
  }
}
