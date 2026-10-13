import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ScheduledJob } from '../scheduler.types';

/**
 * Marks open invitations past their expiry as EXPIRED (MAOS D8, F-2). The
 * invite flow already refuses expired tokens and lists them as expired; this
 * makes the stored status say so too. Idempotent: a second run changes nothing.
 */
@Injectable()
export class InviteExpiryJob implements ScheduledJob {
  readonly name = 'invite-expiry';
  readonly everyMs = 15 * 60 * 1000;
  readonly lockKey = 1;

  async run(tx: Prisma.TransactionClient): Promise<number> {
    const { count } = await tx.invite.updateMany({
      where: { status: 'SENT', expiresAt: { lte: new Date() } },
      data: { status: 'EXPIRED' },
    });
    return count;
  }
}
