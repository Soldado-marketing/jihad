/**
 * Realistic data for the load assessment (MAOS A07): one invented company with
 * 50 projects, 2,000 tasks and 500 files (metadata only), and the rows that
 * hang off them in real use. Every value is invented here; nothing is read from
 * or copied out of production.
 *
 * Refuses any database that is not on this machine, and any database that
 * already holds a company.
 *
 * Usage: DATABASE_URL=postgresql://…@127.0.0.1:…/… node scripts/perf/seed-load.mjs <out-file.json>
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { writeFileSync, chmodSync } from 'node:fs';
import { assertLocal } from './lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(join(root, 'apps/api/package.json'));
const OUT = process.argv[2];
if (!OUT) { console.error('usage: seed-load.mjs <out-file.json>'); process.exit(2); }
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(2); }
assertLocal(process.env.DATABASE_URL.replace(/^postgres(ql)?:/, 'http:'), 'the database');

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
if (await prisma.tenant.count() > 0) { console.error('REFUSED: this database already holds a company; the seed wants an empty, disposable one'); process.exit(2); }

const SIZE = { projects: 50, tasks: 2000, files: 500, customers: 12, employees: 12, contractors: 3, labels: 12 };
const STATUSES = ['TODO', 'TODO', 'IN_PROGRESS', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'DONE', 'DONE', 'BLOCKED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'URGENT'];
const KINDS = ['Storyboard', 'Shooting day', 'Rough cut', 'Colour grade', 'Sound mix', 'Subtitles', 'Thumbnail', 'Client review', 'Final export', 'Social cut'];
// A fixed generator, so two runs measure the same data.
let state = 20261120;
const rnd = () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (list) => list[Math.floor(rnd() * list.length)];
const daysAgo = (d) => new Date(Date.UTC(2026, 10, 20) - d * 86400000);
const chunked = async (rows, write, size = 500) => { for (let i = 0; i < rows.length; i += size) await write(rows.slice(i, i + size)); };

const password = randomBytes(18).toString('base64url');
const passwordHash = await bcrypt.hash(password, 10);
const tenant = await prisma.tenant.create({ data: { name: 'Load Check Agency (invented)', slug: 'load-check', status: 'ACTIVE' } });
const tenantId = tenant.id;

async function person(key, role, extra = {}) {
  const user = await prisma.user.create({ data: { email: `${key}@load-check.test`, displayName: `Load ${key.replace(/-/g, ' ')}`, passwordHash, status: 'APPROVED' } });
  await prisma.tenantMembership.create({ data: { tenantId, userId: user.id, role, status: 'ACTIVE', ...extra } });
  return { id: user.id, email: user.email, role };
}
const owner = await person('owner', 'OWNER');
const manager = await person('manager', 'MANAGER');
const employees = []; for (let i = 1; i <= SIZE.employees; i++) employees.push(await person(`employee-${i}`, 'EMPLOYEE'));
const contractors = []; for (let i = 1; i <= SIZE.contractors; i++) contractors.push(await person(`contractor-${i}`, 'CONTRACTOR'));
const staff = [manager, ...employees];

const customers = [];
for (let i = 1; i <= SIZE.customers; i++) {
  customers.push(await prisma.customer.create({ data: { tenantId, name: `Invented Customer ${String(i).padStart(2, '0')}`, clientScopeKey: `load-cust-${i}`, status: 'ACTIVE', industry: pick(['Retail', 'Gastronomy', 'Real estate', 'Health']), responsibleUserId: manager.id } }));
}
// One client per customer; the first one is the client the run signs in as.
const clients = []; for (let i = 1; i <= SIZE.customers; i++) clients.push(await person(`client-${i}`, 'CLIENT', { clientScopeKey: `load-cust-${i}` }));

const projects = [];
for (let i = 1; i <= SIZE.projects; i++) {
  const customer = customers[(i - 1) % customers.length];
  projects.push(await prisma.project.create({ data: {
    tenantId, name: `Campaign ${String(i).padStart(2, '0')} for ${customer.name}`, description: 'Invented project for the load assessment.',
    status: i % 9 === 0 ? 'PAUSED' : 'ACTIVE', clientVisible: true, clientScopeKey: customer.clientScopeKey, customerId: customer.id,
    ownerUserId: manager.id, projectNumber: `LC-${String(i).padStart(3, '0')}`, deadline: daysAgo(-30 - i),
  } }));
}
// Every employee works in a handful of projects; contractors in two each.
const members = [];
projects.forEach((p, i) => { for (let k = 0; k < 3; k++) members.push({ tenantId, projectId: p.id, userId: employees[(i + k * 5) % employees.length].id, role: 'EMPLOYEE' }); });
contractors.forEach((c, i) => { for (let k = 0; k < 2; k++) members.push({ tenantId, projectId: projects[(i * 7 + k) % projects.length].id, userId: c.id, role: 'CONTRACTOR' }); });
await prisma.projectMember.createMany({ data: members, skipDuplicates: true });

const labels = [];
for (let i = 1; i <= SIZE.labels; i++) labels.push(await prisma.label.create({ data: { tenantId, name: `label-${i}`, color: pick(['#ef4444', '#22c55e', '#0ea5e9', '#6366f1']) } }));

const tasks = [];
for (let i = 1; i <= SIZE.tasks; i++) {
  const project = projects[(i - 1) % projects.length];
  const status = pick(STATUSES);
  const age = Math.floor(rnd() * 180);
  tasks.push({
    id: `loadtask${String(i).padStart(6, '0')}`, tenantId, projectId: project.id, title: `${pick(KINDS)} ${String(i).padStart(4, '0')} — ${project.name}`,
    description: rnd() < 0.6 ? 'Invented description: scope, references and the delivery format agreed with the customer.' : null,
    status, priority: pick(PRIORITIES), sortOrder: i, assignedToUserId: rnd() < 0.85 ? pick(staff).id : null,
    clientVisible: rnd() < 0.3, clientScopeKey: project.clientScopeKey, dueAt: rnd() < 0.7 ? daysAgo(age - 30) : null, createdAt: daysAgo(age), updatedAt: daysAgo(Math.floor(age / 2)),
  });
}
await chunked(tasks, (rows) => prisma.task.createMany({ data: rows }));

const subtasks = []; const taskLabels = []; const notes = []; const audit = []; const notices = [];
for (const t of tasks) {
  const n = Math.floor(rnd() * 4);
  for (let k = 0; k < n; k++) subtasks.push({ tenantId, taskId: t.id, title: `Step ${k + 1}`, status: rnd() < 0.5 ? 'DONE' : 'TODO', sortOrder: k });
  if (rnd() < 0.5) taskLabels.push({ tenantId, taskId: t.id, labelId: pick(labels).id });
  const comments = rnd() < 0.35 ? 1 + Math.floor(rnd() * 4) : 0;
  for (let k = 0; k < comments; k++) notes.push({ tenantId, resourceType: 'task', resourceId: t.id, body: 'Invented comment about the next step of this task.', createdByUserId: pick(staff).id, createdAt: daysAgo(Math.floor(rnd() * 60)) });
  audit.push({ tenantId, actorId: manager.id, resourceType: 'task', resourceId: t.id, action: 'task.created', permissionResult: 'ALLOWED', outcome: 'SUCCESS', createdAt: t.createdAt });
  const moves = Math.floor(rnd() * 4);
  for (let k = 0; k < moves; k++) audit.push({ tenantId, actorId: t.assignedToUserId ?? manager.id, resourceType: 'task', resourceId: t.id, action: 'task.status.changed', permissionResult: 'ALLOWED', outcome: 'SUCCESS', redactedPayload: { from: 'TODO', to: t.status }, createdAt: daysAgo(Math.floor(rnd() * 90)) });
  if (t.assignedToUserId) notices.push({ tenantId, recipientUserId: t.assignedToUserId, title: 'Task assigned to you', body: t.title, resourceType: 'task', resourceId: t.id, status: rnd() < 0.7 ? 'READ' : 'UNREAD', createdAt: t.createdAt });
}
await chunked(subtasks, (rows) => prisma.subtask.createMany({ data: rows }));
await chunked(taskLabels, (rows) => prisma.taskLabel.createMany({ data: rows, skipDuplicates: true }));
await chunked(notes, (rows) => prisma.internalNote.createMany({ data: rows }));
await chunked(audit, (rows) => prisma.auditEvent.createMany({ data: rows }));
await chunked(notices, (rows) => prisma.notification.createMany({ data: rows }));

// Files: metadata only, one or two versions each, no stored object.
const files = []; const versions = [];
for (let i = 1; i <= SIZE.files; i++) {
  const t = tasks[(i * 4 - 1) % tasks.length];
  const id = `loadfile${String(i).padStart(6, '0')}`;
  const count = rnd() < 0.3 ? 2 : 1;
  files.push({ id, tenantId, projectId: t.projectId, taskId: rnd() < 0.6 ? t.id : null, name: `${pick(KINDS).toLowerCase().replace(/ /g, '-')}-${String(i).padStart(3, '0')}.${pick(['mp4', 'mov', 'jpg', 'pdf'])}`, mimeType: pick(['video/mp4', 'image/jpeg', 'application/pdf']), sizeBytes: 1_000_000 + Math.floor(rnd() * 20_000_000), visibility: 'INTERNAL', clientVisible: rnd() < 0.25, clientScopeKey: t.clientScopeKey, versionCount: count, createdByUserId: pick(staff).id, createdAt: daysAgo(Math.floor(rnd() * 120)) });
  for (let v = 1; v <= count; v++) versions.push({ tenantId, fileAssetId: id, versionNumber: v, originalName: `v${v}`, sizeBytes: 1_000_000, status: 'ACTIVE', createdByUserId: manager.id });
}
await chunked(files, (rows) => prisma.fileAsset.createMany({ data: rows }));
await chunked(versions, (rows) => prisma.fileVersion.createMany({ data: rows }));

const counts = {
  projects: await prisma.project.count(), tasks: await prisma.task.count(), files: await prisma.fileAsset.count(), fileVersions: await prisma.fileVersion.count(),
  customers: await prisma.customer.count(), users: await prisma.user.count(), projectMembers: await prisma.projectMember.count(), subtasks: await prisma.subtask.count(),
  labels: await prisma.label.count(), taskLabels: await prisma.taskLabel.count(), comments: await prisma.internalNote.count(), notifications: await prisma.notification.count(), auditEvents: await prisma.auditEvent.count(),
};
const busiest = employees.map((e) => ({ e, n: tasks.filter((t) => t.assignedToUserId === e.id).length })).sort((a, b) => b.n - a.n)[0];
const sample = { task: tasks[10].id, commentedTask: notes[0].resourceId, project: projects[0].id, customer: customers[0].id, label: labels[0].id, file: files[0].id };
writeFileSync(OUT, JSON.stringify({ tenantSlug: tenant.slug, password, people: { owner: owner.email, manager: manager.email, employee: busiest.e.email, contractor: contractors[0].email, client: clients[0].email }, sample, counts }, null, 2));
chmodSync(OUT, 0o600);
console.log('seeded', JSON.stringify(counts));
await prisma.$disconnect();
