/**
 * Phase 2 — Dependency-free Redis readiness probe.
 *
 * Opens a short TCP connection to the Redis host/port derived from REDIS_URL.
 * No Redis client dependency is required for the MVP. Credentials embedded in
 * REDIS_URL are never read, logged, or returned.
 */

import { connect } from 'node:net';

export interface RedisCheckResult {
  status: 'up' | 'down' | 'skipped';
}

const DEFAULT_TIMEOUT_MS = 1500;

/** Extracts host/port from a redis URL without exposing credentials. */
export function parseRedisTarget(
  url: string | undefined,
): { host: string; port: number } | null {
  if (!url || url.trim() === '') return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return null;
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
    };
  } catch {
    return null;
  }
}

export function checkRedis(
  url: string | undefined,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<RedisCheckResult> {
  const target = parseRedisTarget(url);
  // Not configured → not a failure for the single-instance MVP.
  if (!target) return Promise.resolve({ status: 'skipped' });

  return new Promise<RedisCheckResult>((resolve) => {
    let settled = false;
    const finish = (status: RedisCheckResult['status']) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ status });
    };

    const socket = connect({ host: target.host, port: target.port });
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish('up'));
    socket.once('timeout', () => finish('down'));
    socket.once('error', () => finish('down'));
  });
}
