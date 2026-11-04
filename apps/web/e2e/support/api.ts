/**
 * Thin HTTP helpers for the smoke's seed and API-level assertions. Every call
 * goes through the public API exactly as the web app or an operator would.
 */
export const API = (process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api').replace(/\/$/, '');

export interface Person { email: string; password: string; fullName: string; id?: string }

/** What POST /auth/login answers; the web app stores exactly this in localStorage. */
export interface Session {
  user: { id: string; email: string; displayName: string; role: string };
  tenant: { id: string; name: string; slug: string };
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
}

export async function call<T = unknown>(
  path: string,
  init: { method?: string; token?: string; body?: unknown; form?: FormData; fromIp?: string } = {},
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = {};
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  // The seed signs several people in within seconds. Login is throttled per
  // client address (10 a minute), so each seeded person signs in from its own
  // documentation-range address; the API runs with TRUST_PROXY_HOPS=1 here,
  // as it does behind Railway's proxy. The browser tests never send this.
  if (init.fromIp) headers['X-Forwarded-For'] = init.fromIp;
  let body: BodyInit | undefined;
  if (init.form) body = init.form;
  else if (init.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(init.body); }
  const res = await fetch(`${API}${path}`, { method: init.method ?? 'GET', headers, body });
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: res.status, body: parsed as T };
}

let seedIp = 0;
/** A fresh documentation-range address for one seeded sign-in. */
export const nextSeedIp = () => `198.51.100.${(seedIp = (seedIp % 250) + 1)}`;

export async function loginSession(p: Person, tenantSlug?: string): Promise<Session> {
  const r = await call<Session>('/auth/login', {
    method: 'POST', fromIp: nextSeedIp(), body: { email: p.email, passwordOrMagicCode: p.password, ...(tenantSlug ? { tenantSlug } : {}) },
  });
  if (r.status !== 200 || !r.body?.tokens) throw new Error(`login ${p.email}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

/** Fails loudly with the API's answer when a seed step does not come back as expected. */
export function expectStatus(step: string, r: { status: number; body: unknown }, ...ok: number[]) {
  if (!ok.includes(r.status)) throw new Error(`${step}: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
}
