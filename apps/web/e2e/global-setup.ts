import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { API, call, expectStatus, loginSession, type Person, type Session } from './support/api';
import { SEED_FILE, type Seed } from './support/seed';

/**
 * One fictional world for the whole run, built through the public API as an
 * operator would build it: the first company (bootstrap), its OWNER, MANAGER,
 * EMPLOYEE and two CLIENTs of two customers, a shared project with a board,
 * a shared task, a task assigned to the employee, an appointment, a sent
 * invoice, an uploaded file delivered to the client; and a second company
 * seeded directly (bootstrap serves only the first), so company isolation can
 * be checked from a browser. Credentials are random per run and never leave
 * .playwright/seed.json, which is ignored by git.
 *
 * Existing-environment mode (E2E_PEOPLE_FILE): when the people, customers and
 * the second company already exist — seeded by an operator for an acceptance
 * run against a deployed environment — the file names them (same shape as the
 * `people` part of the seed) and this setup skips bootstrap, invitations and the
 * direct seed; everything else is built through the public API as before.
 * E2E_SETTLE_SECONDS pauses after seeding so the login throttle recovers.
 */
const run = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
const secret = () => randomBytes(18).toString('base64url');
const person = (label: string, fullName: string): Person => ({ email: `${label}-${run}@example.test`, password: secret(), fullName });
// A real 1x1 PNG: the API checks file signatures and prepares a client copy.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function invite(ownerToken: string, p: Person, role: string, extra: Record<string, unknown> = {}): Promise<{ person: Person; session: Session }> {
  const inv = await call<{ inviteUrl?: string }>('/admin/invites', { method: 'POST', token: ownerToken, body: { email: p.email, role, ...extra } });
  expectStatus(`invite ${role}`, inv, 201);
  if (!inv.body.inviteUrl) throw new Error(`invite ${role}: no inviteUrl (the API must run without a mail provider)`);
  const token = new URL(inv.body.inviteUrl).searchParams.get('token');
  expectStatus(`accept ${role}`, await call('/auth/invites/accept', { method: 'POST', body: { token, fullName: p.fullName, password: p.password } }), 200, 201);
  const session = await loginSession(p);
  return { person: { ...p, id: session.user.id }, session };
}

export default async function globalSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL ?? '';
  if (!databaseUrl && !process.env.E2E_PEOPLE_FILE) throw new Error('E2E_DATABASE_URL must point at the disposable database of this run (or E2E_PEOPLE_FILE must name pre-seeded people).');

  type People = Pick<Seed, 'company' | 'owner' | 'manager' | 'employee' | 'clientOne' | 'clientTwo' | 'customerOne' | 'customerTwo' | 'other'>;
  const peopleFile = process.env.E2E_PEOPLE_FILE;
  const existing: People | null = peopleFile ? (JSON.parse(readFileSync(peopleFile, 'utf8')) as People) : null;

  let owner: Person; let company: Seed['company']; let ownerSession: Session;
  if (existing) {
    owner = existing.owner; company = existing.company;
    ownerSession = await loginSession(owner, company.slug);
  } else {
    owner = person('owner', 'E2E Owner');
    company = { slug: `e2e-${run}`, name: `E2E Agency ${run}` };
    const boot = await call('/auth/bootstrap', { method: 'POST', body: { ...owner, tenantName: company.name, tenantSlug: company.slug } });
    if (boot.status === 403) throw new Error('An OWNER already exists in this database; the smoke needs an empty disposable database or E2E_PEOPLE_FILE.');
    expectStatus('bootstrap', boot, 200, 201);
    ownerSession = await loginSession(owner);
    owner.id = ownerSession.user.id;
  }
  const ot = ownerSession.tokens.accessToken;

  const customerOne = existing ? { ...existing.customerOne } : { id: '', name: `E2E Customer One ${run}` };
  const customerTwo = existing ? { ...existing.customerTwo } : { id: '', name: `E2E Customer Two ${run}` };
  if (!existing) {
    for (const [c, key] of [[customerOne, 'one'], [customerTwo, 'two']] as const) {
      const r = await call<{ id: string }>('/customers', { method: 'POST', token: ot, body: { name: c.name, clientScopeKey: `e2e-${key}-${run}` } });
      expectStatus('customer', r, 201); c.id = r.body.id;
    }
  }
  const scopeKeyOne = (existing?.customerOne as { clientScopeKey?: string } | undefined)?.clientScopeKey ?? `e2e-one-${run}`;

  const signedIn = async (p: Person) => {
    const session = await loginSession(p, company.slug);
    return { person: { ...p, id: session.user.id }, session };
  };
  const { person: manager, session: managerSession } = existing ? await signedIn(existing.manager) : await invite(ot, person('manager', 'E2E Manager'), 'MANAGER');
  const { person: employee, session: employeeSession } = existing ? await signedIn(existing.employee) : await invite(ot, person('employee', 'E2E Employee'), 'EMPLOYEE');
  const { person: clientOne, session: clientOneSession } = existing ? await signedIn(existing.clientOne) : await invite(ot, person('client-one', 'E2E Client One'), 'CLIENT', { customerId: customerOne.id });
  const { person: clientTwo, session: clientTwoSession } = existing ? await signedIn(existing.clientTwo) : await invite(ot, person('client-two', 'E2E Client Two'), 'CLIENT', { customerId: customerTwo.id });

  const project = { id: '', name: `E2E Launch Campaign ${run}` };
  const p = await call<{ id: string }>('/projects', { method: 'POST', token: ot, body: { name: project.name, customerId: customerOne.id } });
  expectStatus('project', p, 201); project.id = p.body.id;
  expectStatus('share project', await call(`/projects/${project.id}`, { method: 'PATCH', token: ot, body: { clientVisible: true } }), 200);
  expectStatus('board lists', await call(`/projects/${project.id}/lists/initialize`, { method: 'POST', token: ot }), 200, 201);

  const internalProject = { id: '', name: `E2E Internal Project ${run}` };
  const ip = await call<{ id: string }>('/projects', { method: 'POST', token: ot, body: { name: internalProject.name } });
  expectStatus('internal project', ip, 201); internalProject.id = ip.body.id;

  const sharedTask = { id: '', title: `E2E Shared Task ${run}` };
  const t1 = await call<{ id: string }>('/tasks', { method: 'POST', token: ot, body: { title: sharedTask.title, projectId: project.id } });
  expectStatus('shared task', t1, 201); sharedTask.id = t1.body.id;
  expectStatus('share task', await call(`/tasks/${sharedTask.id}`, { method: 'PATCH', token: ot, body: { clientVisible: true } }), 200);

  const assignedTask = { id: '', title: `E2E Assigned Task ${run}` };
  const t2 = await call<{ id: string }>('/tasks', { method: 'POST', token: ot, body: { title: assignedTask.title, projectId: project.id, assignedToUserId: employee.id } });
  expectStatus('assigned task', t2, 201); assignedTask.id = t2.body.id;

  const appointment = { id: '', title: `E2E Filming ${run}`, location: 'E2E Studio' };
  const ap = await call<{ id: string }>('/appointments', {
    method: 'POST', token: ot, body: { projectId: project.id, startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), location: appointment.location, title: appointment.title },
  });
  expectStatus('appointment', ap, 201); appointment.id = ap.body.id;

  const invoice = { id: '', number: `E2E-${run.toUpperCase()}` };
  const inv = await call<{ id: string }>('/invoices', {
    method: 'POST', token: ot,
    body: { invoiceNumber: invoice.number, currency: 'EUR', projectId: project.id, dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(), lines: [{ description: 'Campaign setup', quantity: 1, unitAmountCents: 125_000 }] },
  });
  expectStatus('invoice', inv, 201); invoice.id = inv.body.id;
  expectStatus('invoice sent', await call(`/invoices/${invoice.id}/status`, { method: 'PATCH', token: ot, body: { status: 'SENT' } }), 200);

  // One delivered file per viewport project (desktop, mobile): each project's
  // owner sees its file in review and its client approves it, independently.
  async function deliverFile(label: string) {
    const file = { id: '', name: `E2E-${label}-deliverable-${run}.png`, versionId: '', deliveryId: '' };
    const f = await call<{ id: string }>('/files', { method: 'POST', token: ot, body: { name: file.name, projectId: project.id, visibility: 'CLIENT_VISIBLE' } });
    expectStatus('file', f, 201); file.id = f.body.id;
    const form = new FormData();
    form.append('file', new Blob([PNG], { type: 'image/png' }), file.name);
    const v = await call<{ id?: string; version?: { id: string } }>(`/files/${file.id}/versions`, { method: 'POST', token: ot, form });
    expectStatus('upload', v, 201, 200);
    file.versionId = v.body.id ?? v.body.version?.id ?? '';
    if (!file.versionId) throw new Error(`upload: no version id in ${JSON.stringify(v.body).slice(0, 200)}`);
    const d = await call<{ id: string }>('/deliveries', { method: 'POST', token: ot, body: { fileAssetId: file.id, fileVersionId: file.versionId, message: 'Please review the first version.' } });
    expectStatus('delivery', d, 201); file.deliveryId = d.body.id;
    return file;
  }
  // Per viewport project: one delivery the client approves, one the client sends back for revision.
  const files = {
    desktop: await deliverFile('desktop'), mobile: await deliverFile('mobile'),
    desktopRevision: await deliverFile('desktop-revision'), mobileRevision: await deliverFile('mobile-revision'),
  };

  const other = existing ? existing.other : JSON.parse(execFileSync(process.execPath, [resolve(process.cwd(), '../api/test/e2e-seed-company.mjs')], {
    env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: 'utf8', cwd: resolve(process.cwd(), '../api'),
  })) as Seed['other'];

  const otherOwnerSession: Session = await loginSession(other.owner);

  const seed: Seed = {
    run, company, owner, manager, employee, clientOne, clientTwo, customerOne, customerTwo, project, internalProject, sharedTask, assignedTask, appointment, invoice, files, other,
    sessions: { owner: ownerSession, manager: managerSession, employee: employeeSession, clientOne: clientOneSession, clientTwo: clientTwoSession, otherOwner: otherOwnerSession },
  };
  mkdirSync(dirname(SEED_FILE), { recursive: true });
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), { mode: 0o600 });
  console.log(`[e2e] seeded run ${run} against ${API}${existing ? ' (existing environment)' : ''}`);
  const settle = Number(process.env.E2E_SETTLE_SECONDS ?? 0);
  if (settle > 0) await new Promise((r) => setTimeout(r, settle * 1000));
}
