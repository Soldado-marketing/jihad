import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { checkRedis, RedisCheckResult } from './redis-check';

/**
 * Phase 2 — Liveness vs readiness.
 *
 * GET /api/health        → liveness: the process is up (always 200 while running).
 * GET /api/health/ready  → readiness: real dependency probes (PostgreSQL, Redis).
 *                          Returns 503 when a required dependency is unavailable,
 *                          so orchestrators stop routing traffic to a broken instance.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth() {
    return {
      service: 'maos-api',
      status: 'ok',
    };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async getReadiness(@Res({ passthrough: true }) res: Response) {
    const database = await this.checkDatabase();
    const redis: RedisCheckResult = await checkRedis(process.env.REDIS_URL);

    // Database is required. Redis is optional for the single-instance MVP:
    // 'skipped' (not configured) does not fail readiness, but 'down' does.
    const ready = database.status === 'up' && redis.status !== 'down';

    if (!ready) res.status(HttpStatus.SERVICE_UNAVAILABLE);

    return {
      service: 'maos-api',
      status: ready ? 'ready' : 'not-ready',
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch {
      // Reason intentionally omitted — connection strings must never surface.
      return { status: 'down' };
    }
  }
}
