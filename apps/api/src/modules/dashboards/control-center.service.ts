import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { PermissionService } from '../permissions/permission.service';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ControlCenterRepository } from './control-center.repository';

const DAY = 24 * 60 * 60 * 1000;
/** A project deadline this close (or already past) needs the owner's eye. */
const DEADLINE_WINDOW_DAYS = 14;
const ACTIVITY_WINDOW_DAYS = 7;
const MAX_ATTENTION = 15;
const MAX_PROJECTS = 10;
const MAX_ACTIVITY = 12;

const OWNER_OVERVIEW = { action: PermissionAction.READ, resource: PermissionResource.DASHBOARD, sensitive: true };
const FINANCE_READ = { action: PermissionAction.READ, resource: PermissionResource.FINANCE, sensitive: true };

type Person = { id: string; displayName: string | null; email: string } | null;
const nameOf = (p: Person) => (p ? p.displayName || p.email : null);
type Company = { id: string; name: string; slug: string };

/**
 * Owner Control Center: one read-only overview of every company where the
 * caller is an ACTIVE OWNER. Each company is authorized on its own through
 * PermissionService (the same check PermissionGuard runs), finance is checked
 * separately, and every query is scoped to that company's tenantId. Viewing
 * never changes the caller's active company; opening a record in another
 * company goes through the existing /auth/companies/switch.
 */
@Injectable()
export class ControlCenterService {
  constructor(
    private readonly repo: ControlCenterRepository,
    private readonly permissions: PermissionService,
  ) {}

  async getOverview(actor: JwtPayload) {
    // The guard already verified OWNER in the active company; a custom grant on
    // a non-owner membership must not open a cross-company view either.
    if (actor.role !== MembershipRole.OWNER) throw new ForbiddenException('Only company owners can open the Control Center');

    const memberships = await this.repo.ownerMemberships(actor.sub);
    if (!memberships.some((m) => m.tenant.id === actor.tenantId)) {
      throw new ForbiddenException('Only company owners can open the Control Center');
    }
    const now = new Date();
    const results = await Promise.all(memberships.map((m) => this.company(actor, m.tenant, now)));
    const companies = results.filter((c): c is NonNullable<typeof c> => c !== null);

    const byTime = <T>(get: (x: T) => number) => (a: T, b: T) => get(a) - get(b);
    return {
      generatedAt: now.toISOString(),
      currentTenantId: actor.tenantId,
      companies: companies.map((c) => c.summary),
      attention: companies.flatMap((c) => c.attention)
        .sort((a, b) => a.rank - b.rank || Date.parse(a.sortAt) - Date.parse(b.sortAt))
        .slice(0, MAX_ATTENTION),
      projects: companies.flatMap((c) => c.projects)
        .sort((a, b) => (b.overdueTasks + b.blockedTasks) - (a.overdueTasks + a.blockedTasks)
          || byTime<{ deadline: string | null }>((p) => (p.deadline ? Date.parse(p.deadline) : Infinity))(a, b))
        .slice(0, MAX_PROJECTS),
      overdueAssignees: companies.flatMap((c) => c.overdueAssignees),
      overdueInvoices: companies.flatMap((c) => c.overdueInvoices),
      activity: companies.flatMap((c) => c.activity)
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        .slice(0, MAX_ACTIVITY),
    };
  }

  private async company(actor: JwtPayload, tenant: Company, now: Date) {
    const owner = await this.permissions.decide(OWNER_OVERVIEW, actor.sub, tenant.id, MembershipRole.OWNER);
    if (!owner.allowed) return null;
    const finance = await this.permissions.decide(FINANCE_READ, actor.sub, tenant.id, MembershipRole.OWNER);

    const soon = new Date(now.getTime() + DEADLINE_WINDOW_DAYS * DAY);
    const since = new Date(now.getTime() - ACTIVITY_WINDOW_DAYS * DAY);
    const [work, [approvals, blocked, overdue], projects, money, [done, decisions, requests]] = await Promise.all([
      this.repo.companyWork(tenant.id, now),
      this.repo.attention(tenant.id, now),
      this.repo.projectsNeedingAttention(tenant.id, now, soon),
      finance.allowed ? this.repo.finance(tenant.id, now) : Promise.resolve(null),
      this.repo.recentActivity(tenant.id, since),
    ]);
    const people = await this.repo.people(tenant.id, [
      ...approvals.map((a) => a.requestedByUserId).filter((id): id is string => !!id),
      ...work.overdueByAssignee.map((r) => r.userId),
    ]);
    const personName = (id: string | null) => nameOf(people.find((p) => p.id === id) ?? null);
    const company = { tenantId: tenant.id, companyName: tenant.name };
    const iso = (d: Date | null) => (d ? d.toISOString() : null);

    const attention = [
      ...approvals.map((a) => ({
        ...company, kind: 'approval' as const, id: a.id, title: a.title, project: null,
        responsible: personName(a.requestedByUserId),
        reason: a.dueAt && a.dueAt < now ? 'Approval past its due date' : 'Waiting for an internal decision',
        dueAt: iso(a.dueAt), since: a.createdAt.toISOString(), href: `/approvals?open=${a.id}`,
        rank: a.dueAt && a.dueAt < now ? 0 : 3, sortAt: (a.dueAt ?? a.createdAt).toISOString(),
      })),
      ...blocked.map((t) => ({
        ...company, kind: 'blocked' as const, id: t.id, title: t.title, project: t.project,
        responsible: nameOf(t.assignedTo), reason: 'Task is blocked',
        dueAt: iso(t.dueAt), since: t.updatedAt.toISOString(), href: `/tasks/${t.id}`,
        rank: 1, sortAt: t.updatedAt.toISOString(),
      })),
      ...overdue.map((t) => ({
        ...company, kind: 'overdue' as const, id: t.id, title: t.title, project: t.project,
        responsible: nameOf(t.assignedTo),
        reason: t.assignedTo ? 'Task is overdue' : 'Task is overdue and has no assignee',
        dueAt: iso(t.dueAt), since: null, href: `/tasks/${t.id}`,
        rank: 2, sortAt: (t.dueAt as Date).toISOString(),
      })),
    ];

    return {
      summary: {
        id: tenant.id, name: tenant.name, slug: tenant.slug, isCurrent: tenant.id === actor.tenantId,
        counts: work.counts,
        finance: money ? { outstanding: money.outstanding, overdue: money.overdue, draftInvoices: money.drafts } : null,
      },
      attention,
      projects: projects.map((p) => ({
        ...company, id: p.id, name: p.name, status: p.status, owner: nameOf(p.owner),
        deadline: iso(p.deadline), deadlinePassed: !!p.deadline && p.deadline < now,
        overdueTasks: p.overdueTasks, blockedTasks: p.blockedTasks, href: `/projects/${p.id}`,
      })),
      overdueAssignees: work.overdueByAssignee.map((r) => ({ ...company, name: personName(r.userId), overdue: r.overdue })),
      overdueInvoices: (money?.overdueList ?? []).map((i) => ({
        ...company, id: i.id, invoiceNumber: i.invoiceNumber, currency: i.currency, status: i.status,
        openCents: i.totalCents - i.paidCents, dueAt: iso(i.dueAt), customer: i.customer?.name ?? null,
        href: `/finance/invoices/${i.id}`,
      })),
      activity: [
        ...done.map((t) => ({
          ...company, kind: 'task_done' as const, title: t.title, by: nameOf(t.assignedTo),
          at: t.updatedAt.toISOString(), href: `/tasks/${t.id}`,
        })),
        ...decisions.map((d) => ({
          ...company, kind: 'approval_decided' as const, decision: d.decision, title: d.approvalRequest.title, by: null,
          at: d.createdAt.toISOString(), href: `/approvals?open=${d.approvalRequest.id}`,
        })),
        ...requests.map((r) => ({
          ...company, kind: 'approval_requested' as const, title: r.title, by: null,
          at: r.createdAt.toISOString(), href: `/approvals?open=${r.id}`,
        })),
      ],
    };
  }
}
