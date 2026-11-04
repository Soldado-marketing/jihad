import { randomBytes } from 'node:crypto';

/**
 * Fictional company, OWNER and CLIENT for one smoke run, created through the
 * public API exactly as an operator would: one-time bootstrap, a customer, a
 * CLIENT invitation accepted with the link the API returns when no mail
 * provider is configured. Every value is generated per run; nothing here is a
 * real person, company or credential.
 */
export const API = (process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api').replace(/\/$/, '');

export interface Person { email: string; password: string; fullName: string }
export interface Seed { tenantSlug: string; tenantName: string; owner: Person; client: Person; customerName: string }

const run = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
const secret = () => randomBytes(18).toString('base64url');

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body: body as T };
}

export async function login(p: Person): Promise<string> {
  const r = await call<{ tokens?: { accessToken: string } }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ email: p.email, passwordOrMagicCode: p.password }),
  });
  if (r.status !== 200 || !r.body.tokens) throw new Error(`login ${p.email}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.tokens.accessToken;
}

/** Bootstrap the company and OWNER, or reuse the OWNER named in the environment. */
async function owner(): Promise<{ owner: Person; tenantSlug: string; tenantName: string }> {
  const tenantSlug = `e2e-${run}`;
  const tenantName = `E2E Agency ${run}`;
  const fresh: Person = { email: `owner-${run}@example.test`, password: secret(), fullName: 'E2E Owner' };
  const r = await call<{ message?: string }>('/auth/bootstrap', {
    method: 'POST', body: JSON.stringify({ ...fresh, tenantName, tenantSlug }),
  });
  if (r.status === 201 || r.status === 200) return { owner: fresh, tenantSlug, tenantName };
  if (r.status === 403 && process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASSWORD) {
    return {
      owner: { email: process.env.E2E_OWNER_EMAIL, password: process.env.E2E_OWNER_PASSWORD, fullName: 'Existing owner' },
      tenantSlug: '', tenantName: '',
    };
  }
  throw new Error(
    r.status === 403
      ? 'An OWNER already exists in this database. The smoke needs an empty disposable database, or E2E_OWNER_EMAIL/E2E_OWNER_PASSWORD of an existing OWNER there.'
      : `bootstrap failed: ${r.status} ${JSON.stringify(r.body)}`,
  );
}

export async function seed(): Promise<Seed> {
  const o = await owner();
  const token = await login(o.owner);
  const customerName = `E2E Customer ${run}`;
  const customer = await call<{ id?: string }>('/customers', {
    method: 'POST', token, body: JSON.stringify({ name: customerName, clientScopeKey: `e2e-customer-${run}` }),
  });
  if (customer.status !== 201 || !customer.body.id) throw new Error(`customer: ${customer.status} ${JSON.stringify(customer.body)}`);
  const client: Person = { email: `client-${run}@example.test`, password: secret(), fullName: 'E2E Client' };
  const invite = await call<{ inviteUrl?: string; delivery?: string }>('/admin/invites', {
    method: 'POST', token, body: JSON.stringify({ email: client.email, role: 'CLIENT', customerId: customer.body.id }),
  });
  if (invite.status !== 201 || !invite.body.inviteUrl) {
    throw new Error(`invite: ${invite.status} ${JSON.stringify(invite.body)} (the API must run without a mail provider so the link is returned)`);
  }
  const inviteToken = new URL(invite.body.inviteUrl).searchParams.get('token');
  const accepted = await call<{ message?: string }>('/auth/invites/accept', {
    method: 'POST', body: JSON.stringify({ token: inviteToken, fullName: client.fullName, password: client.password }),
  });
  if (accepted.status !== 201 && accepted.status !== 200) throw new Error(`accept: ${accepted.status} ${JSON.stringify(accepted.body)}`);
  return { ...o, client, customerName };
}
