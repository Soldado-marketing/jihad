/**
 * Trust proxy configuration (MAOS-T32).
 *
 * In production the API runs behind Railway's proxy, so every TCP connection
 * comes from the proxy. Express then needs `trust proxy` to read the client
 * address from X-Forwarded-For; otherwise req.ip is the proxy for every user
 * and the throttler (and login history) treat all users as one client.
 *
 * Only a fixed number of hops is trusted. With 1 hop, req.ip is the address
 * the nearest proxy appended - anything a client put in front of it is
 * ignored, so it cannot be spoofed. Set TRUST_PROXY_HOPS=0 when the API is
 * reachable without a proxy (X-Forwarded-For is then ignored entirely).
 */

const DEFAULT_HOPS = 1;
const MAX_HOPS = 5;

export interface TrustProxyTarget {
  set(setting: string, value: unknown): unknown;
}

export function resolveTrustProxyHops(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TRUST_PROXY_HOPS;
  if (raw === undefined) return DEFAULT_HOPS;
  if (!/^\d+$/.test(raw) || Number(raw) > MAX_HOPS) {
    throw new Error(`TRUST_PROXY_HOPS must be an integer from 0 to ${MAX_HOPS}`);
  }
  return Number(raw);
}

export function configureTrustProxy(app: TrustProxyTarget, env: NodeJS.ProcessEnv = process.env): number {
  const hops = resolveTrustProxyHops(env);
  app.set('trust proxy', hops);
  return hops;
}
