import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import { assertResourceInTenant } from '../../common/tenant/tenant-references';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionService } from '../permissions/permission.service';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ResourceScopeService, WorkScope } from '../permissions/resource-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationRepository, NoteRow } from './collaboration.repository';
import { MAX_MENTIONS, mentionedUserIds, withCanonicalNames } from './mentions';

type CommentedTask = { id: string; title: string };
type Person = { id: string; displayName: string | null };

/**
 * Internal notes. A note on a task is that task's comment thread (MAOS G07)
 * and follows the task: whoever may not see the task may not read, write,
 * change or remove its comments, whichever route is used. Notes on anything
 * else behave as before.
 */
@Injectable()
export class CollaborationService {
  constructor(
    private readonly repo: CollaborationRepository,
    private readonly prisma: PrismaService,
    private readonly resourceScope: ResourceScopeService,
    private readonly permissions: PermissionService,
    private readonly notifications: NotificationsService,
  ) {}

  async listNotes(tenantId: string, actorId: string, resourceType?: string, resourceId?: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    if (resourceType === 'task' && resourceId) await this.visibleTask(tenantId, resourceId, scope);
    const notes = await this.repo.listNotes(tenantId, resourceType, resourceId, await this.visibleNotes(tenantId, scope));
    return this.withMentions(tenantId, notes);
  }

  async createNote(tenantId: string, actorId: string, body: string, resourceType?: string, resourceId?: string, threadKey?: string) {
    await assertResourceInTenant(this.prisma, tenantId, resourceType, resourceId);
    const task = resourceType === 'task' && resourceId
      ? await this.visibleTask(tenantId, resourceId, await this.resourceScope.resolveWorkScope(tenantId, actorId))
      : null;
    const checked = task ? await this.checkedMentions(tenantId, task, body) : { body, ids: [] };
    const note = await this.repo.createNote(tenantId, actorId, checked.body, resourceType, resourceId, threadKey);
    if (task) await this.notifyMentioned(tenantId, actorId, task, note.id, checked.ids);
    return (await this.withMentions(tenantId, [note]))[0];
  }

  async getNote(tenantId: string, actorId: string, id: string) {
    const { note } = await this.readableNote(tenantId, actorId, id);
    return (await this.withMentions(tenantId, [note]))[0];
  }

  async updateNote(tenantId: string, actorId: string, id: string, body: string) {
    const { note, task } = await this.readableNote(tenantId, actorId, id);
    if (!task) return (await this.withMentions(tenantId, [await this.repo.updateNote(tenantId, id, body)]))[0];

    // A thread is not rewritten by others: only the author changes a comment.
    if (note.createdBy?.id !== actorId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'comment_author_only' });
    }
    const checked = await this.checkedMentions(tenantId, task, body);
    const updated = await this.repo.updateNote(tenantId, id, checked.body);
    // One notice per comment and person: someone added by this change is told
    // now, someone told before is not told again (notify is keyed on the comment).
    await this.notifyMentioned(tenantId, actorId, task, id, checked.ids);
    return (await this.withMentions(tenantId, [updated]))[0];
  }

  async deleteNote(tenantId: string, actorId: string, id: string) {
    const { note, task } = await this.readableNote(tenantId, actorId, id);
    if (task && note.createdBy?.id !== actorId && !(await this.leadsTheCompany(tenantId, actorId))) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'comment_author_or_lead_only' });
    }
    return this.repo.deleteNote(tenantId, id);
  }

  /** The people who may be mentioned in a task's comments: those who may read them. */
  async mentionableMembers(tenantId: string, actorId: string, resourceType?: string, resourceId?: string) {
    if (resourceType !== 'task' || !resourceId) {
      throw new BadRequestException({ code: 'INVALID_REFERENCE', field: 'resourceId', message: 'Mentions are available in task comments only.' });
    }
    const task = await this.visibleTask(tenantId, resourceId, await this.resourceScope.resolveWorkScope(tenantId, actorId));
    const readers = await this.threadReaders(tenantId, task.id);
    return [...readers]
      .map(([id, displayName]) => ({ id, displayName }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  // ── Visibility ──────────────────────────────────────────────────────────────

  /** The task, when the caller may see it. One answer for "not here" and "not yours". */
  private async visibleTask(tenantId: string, taskId: string, scope: WorkScope): Promise<CommentedTask> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId, ...this.resourceScope.taskWhere(scope) },
      select: { id: true, title: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  /**
   * For a caller limited to their own tasks: notes that are not on a task, and
   * comments of the tasks they see. Nothing is narrowed for anyone else.
   */
  private async visibleNotes(tenantId: string, scope: WorkScope): Promise<Prisma.InternalNoteWhereInput> {
    if (!scope) return {};
    const tasks = await this.prisma.task.findMany({
      where: { tenantId, ...this.resourceScope.taskWhere(scope) },
      select: { id: true },
    });
    return {
      OR: [
        { resourceType: null },
        { resourceType: { not: 'task' } },
        { resourceId: { in: tasks.map((t) => t.id) } },
      ],
    };
  }

  /**
   * The note, when the caller may read it. A comment whose task the caller may
   * not see answers like a note that does not exist. `task` is set for a comment.
   */
  private async readableNote(tenantId: string, actorId: string, id: string): Promise<{ note: NoteRow; task: CommentedTask | null }> {
    const note = await this.repo.getNoteById(tenantId, id);
    if (!note) throw new NotFoundException('Note not found');
    if (note.resourceType !== 'task' || !note.resourceId) return { note, task: null };

    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    const task = await this.prisma.task.findFirst({
      where: { id: note.resourceId, tenantId, ...this.resourceScope.taskWhere(scope) },
      select: { id: true, title: true },
    });
    // A comment that outlived its task stays manageable for those who see every task.
    if (!task && scope) throw new NotFoundException('Note not found');
    return { note, task };
  }

  private async leadsTheCompany(tenantId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE' },
      select: { role: true },
    });
    return membership?.role === MembershipRole.OWNER || membership?.role === MembershipRole.MANAGER;
  }

  // ── Mentions ────────────────────────────────────────────────────────────────

  /**
   * Who may read the comments of this task, by the rules every route uses: the
   * internal-note permission as it stands for the member today, and the task
   * being one the member may see. A CLIENT never is one of them.
   */
  private async threadReaders(tenantId: string, taskId: string): Promise<Map<string, string>> {
    const members = await this.prisma.tenantMembership.findMany({
      where: { tenantId, status: 'ACTIVE', role: { not: MembershipRole.CLIENT } },
      select: { userId: true, role: true, user: { select: { displayName: true } } },
    });
    const readers = new Map<string, string>();
    for (const member of members) {
      const decision = await this.permissions.decide(
        { action: PermissionAction.READ, resource: PermissionResource.INTERNAL_NOTE },
        member.userId, tenantId, member.role,
      );
      if (!decision.allowed) continue;
      const scope = await this.resourceScope.resolveWorkScope(tenantId, member.userId);
      if (scope) {
        const sees = await this.prisma.task.count({ where: { id: taskId, tenantId, ...this.resourceScope.taskWhere(scope) } });
        if (sees === 0) continue;
      }
      readers.set(member.userId, member.user.displayName?.trim() || 'Member');
    }
    return readers;
  }

  /**
   * The comment text with every mention checked. A mention of someone who may
   * not read this thread is refused whole: the same answer for a client, a
   * member of another company and an id that does not exist.
   */
  private async checkedMentions(tenantId: string, task: CommentedTask, body: string): Promise<{ body: string; ids: string[] }> {
    const ids = mentionedUserIds(body);
    if (ids.length === 0) return { body, ids };
    if (ids.length > MAX_MENTIONS) {
      throw new BadRequestException({ code: 'TOO_MANY_MENTIONS', message: `A comment can mention at most ${MAX_MENTIONS} people.` });
    }
    const readers = await this.threadReaders(tenantId, task.id);
    if (ids.some((id) => !readers.has(id))) {
      throw new BadRequestException({
        code: 'MENTION_NOT_ALLOWED',
        message: 'Someone you mentioned cannot read the comments of this task.',
      });
    }
    return { body: withCanonicalNames(body, readers), ids };
  }

  /** Tells the mentioned people. The notice names the task and never carries the comment. */
  private async notifyMentioned(tenantId: string, actorId: string, task: CommentedTask, noteId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.notifications.notify({
      tenantId,
      recipientUserIds: ids,
      audience: 'INTERNAL',
      actorUserId: actorId,
      dedupeKey: `task.comment.mention:${noteId}`,
      title: 'You were mentioned in a task comment',
      body: task.title,
      resourceType: 'task',
      resourceId: task.id,
    });
  }

  /** Each note with the people its text mentions, by their current names. */
  private async withMentions(tenantId: string, notes: NoteRow[]): Promise<(NoteRow & { mentions: Person[] })[]> {
    const perNote = notes.map((n) => (n.resourceType === 'task' ? mentionedUserIds(n.body) : []));
    const ids = [...new Set(perNote.flat())];
    const people = new Map<string, Person>();
    if (ids.length > 0) {
      const members = await this.prisma.tenantMembership.findMany({
        where: { tenantId, userId: { in: ids } },
        select: { user: { select: { id: true, displayName: true } } },
      });
      for (const m of members) people.set(m.user.id, m.user);
    }
    return notes.map((note, i) => ({
      ...note,
      mentions: perNote[i].flatMap((id) => (people.has(id) ? [people.get(id) as Person] : [])),
    }));
  }
}
