'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { apiFetch, FORBIDDEN_MESSAGE } from '@/lib/fetch';
import {
  bodyParts, insertMention, matchingMembers, mentionQuery, mentionsIn, plainBody, withMentionTokens,
  type Mentionable,
} from '@/lib/mentions';
import { avatarColor, getInitials } from './task-types';

/**
 * The comment thread of a task (MAOS G07): internal notes on the task, oldest
 * first, with @mentions. Staff only — the API refuses clients and contractors,
 * and whoever may not see the task; a refused reader sees no thread at all.
 */

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; displayName: string | null } | null;
  mentions: Mentionable[];
};

const MAX_LENGTH = 2000;
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const wasEdited = (c: Comment) => new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime() > 1000;
const message = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

// ─── The box a comment is written in ─────────────────────────────────────────

function CommentBox({
  label, submitLabel, busyLabel, members, initialText = '', initialPicked = [], autoFocus = false, onMembersNeeded, onSubmit, onCancel,
}: {
  label: string;
  submitLabel: string;
  busyLabel: string;
  members: Mentionable[];
  initialText?: string;
  initialPicked?: Mentionable[];
  autoFocus?: boolean;
  onMembersNeeded: () => void;
  /** Resolves when the comment is saved; rejects with the sentence to show. */
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [picked, setPicked] = useState<Mentionable[]>(initialPicked);
  const [caret, setCaret] = useState(initialText.length);
  const [active, setActive] = useState(0);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  // The caret goes behind a picked name in the same commit that writes the name:
  // set a frame later, it would jump back under someone who is already typing on.
  const caretAfterPick = useRef<number | null>(null);
  useLayoutEffect(() => {
    const at = caretAfterPick.current;
    if (at === null || !box.current) return;
    caretAfterPick.current = null;
    box.current.focus();
    box.current.setSelectionRange(at, at);
  }, [text]);

  const open = mentionQuery(text, caret);
  const offered = open && closedAt !== open.start ? matchingMembers(members, open.query) : [];
  const listId = `${label.replace(/\s+/g, '-').toLowerCase()}-mentions`;

  function track(el: HTMLTextAreaElement) {
    setText(el.value);
    setCaret(el.selectionStart ?? el.value.length);
    setActive(0);
    setError('');
    if (el.value.includes('@')) onMembersNeeded();
  }

  function pick(member: Mentionable) {
    const next = insertMention(text, caret, member);
    setText(next.text);
    setCaret(next.caret);
    setPicked((list) => (list.some((m) => m.id === member.id) ? list : [...list, member]));
    caretAfterPick.current = next.caret;
  }

  async function submit() {
    const trimmed = text.trim();
    if (busy) return;
    if (trimmed.length < 2) { setError('Write at least two characters.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSubmit(withMentionTokens(trimmed, picked));
      setText('');
      setPicked([]);
      setCaret(0);
    } catch (err) {
      setError(message(err, 'The comment could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (offered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % offered.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + offered.length) % offered.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(offered[Math.min(active, offered.length - 1)]); return; }
      // Escape closes the list of names, not the task editor around it.
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setClosedAt(open?.start ?? null); return; }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); }
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="relative">
        <textarea
          ref={box}
          value={text}
          autoFocus={autoFocus}
          maxLength={MAX_LENGTH}
          rows={3}
          aria-label={label}
          aria-autocomplete="list"
          aria-controls={offered.length > 0 ? listId : undefined}
          placeholder="Write a comment… use @ to mention someone"
          onChange={(e) => track(e.target)}
          onKeyUp={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
          onClick={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
          onKeyDown={onKeyDown}
          className="w-full resize-none text-sm text-ink bg-soft rounded-xl border border-line px-3 py-2.5 outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-accent/30 leading-relaxed"
        />
        {offered.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="People you can mention"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-lg"
          >
            {offered.map((m, i) => (
              <li key={m.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  // mousedown, so the box keeps its caret and the choice lands where it was typed
                  onMouseDown={(e) => { e.preventDefault(); pick(m); }}
                  className={`flex w-full min-w-0 items-center gap-2 px-3 py-1.5 text-left text-sm ${i === active ? 'bg-accent/10 text-ink' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: avatarColor(m.id) }}
                  >
                    {getInitials(m.displayName)}
                  </span>
                  <span className="truncate">{m.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p role="alert" className="text-[11px] text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!text.trim() || busy}
          className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold disabled:opacity-40 hover:bg-accent transition-colors"
        >
          {busy ? busyLabel : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="px-3 py-1.5 rounded-lg border border-line text-xs font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── One comment ─────────────────────────────────────────────────────────────

function CommentText({ comment }: { comment: Comment }) {
  // A mention is marked only when the server confirmed the person; anything else stays plain text.
  const known = new Set(comment.mentions.map((m) => m.id));
  return (
    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
      {bodyParts(comment.body).map((part, i) => (part.mention && known.has(part.mention.id)
        ? <span key={i} data-mention={part.mention.id} className="rounded bg-accent/10 px-1 font-medium text-accent">{part.text}</span>
        : <span key={i}>{part.text}</span>))}
    </p>
  );
}

// ─── The thread ──────────────────────────────────────────────────────────────

export function TaskComments({ taskId, onCount, onRefused }: {
  taskId: string;
  onCount?: (count: number) => void;
  /** Called when this person may not read internal comments, so the editor can leave the section out. */
  onRefused?: () => void;
}) {
  const me = useMemo(() => getStoredUser(), []);
  const leads = me?.role === 'OWNER' || me?.role === 'MANAGER';

  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);
  const [members, setMembers] = useState<Mentionable[]>([]);
  const membersAsked = useRef(false);
  const [editing, setEditing] = useState<string | null>(null);
  // Creation and a quick change can carry almost the same time; a change made here is marked at once.
  const [editedHere, setEditedHere] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<{ id: string; text: string } | null>(null);

  const query = `resourceType=task&resourceId=${encodeURIComponent(taskId)}`;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await apiFetch<Comment[]>(`/collaboration/notes?${query}`);
      // The API answers newest first; a thread reads from the top down.
      setComments(Array.isArray(rows) ? [...rows].reverse() : []);
    } catch (err) {
      const text = message(err, 'Could not load the comments.');
      // Someone who may not read internal comments is shown no thread, not an error.
      if (text === FORBIDDEN_MESSAGE) { setRefused(true); onRefused?.(); } else setLoadError(text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    setComments(null);
    setRefused(false);
    setEditing(null);
    membersAsked.current = false;
    setMembers([]);
    void load();
  }, [load]);

  useEffect(() => { if (comments) onCount?.(comments.length); }, [comments, onCount]);

  // The people who may be mentioned are asked for when the first "@" is typed.
  const askMembers = useCallback(() => {
    if (membersAsked.current) return;
    membersAsked.current = true;
    apiFetch<Mentionable[]>(`/collaboration/notes/mentionable?${query}`)
      .then((rows) => setMembers(Array.isArray(rows) ? rows.filter((m) => m.id !== me?.id) : []))
      // Without the list a comment can still be written; the next "@" asks again.
      .catch(() => { membersAsked.current = false; });
  }, [query, me?.id]);

  async function add(body: string) {
    const created = await apiFetch<Comment>('/collaboration/notes', {
      method: 'POST',
      body: JSON.stringify({ body, resourceType: 'task', resourceId: taskId }),
    });
    setComments((list) => [...(list ?? []), created]);
  }

  async function save(id: string, body: string) {
    const updated = await apiFetch<Comment>(`/collaboration/notes/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
    setComments((list) => list?.map((c) => (c.id === id ? updated : c)) ?? null);
    setEditedHere((ids) => new Set(ids).add(id));
    setEditing(null);
  }

  async function remove(id: string) {
    setRemoving(id);
    setRemoveError(null);
    try {
      await apiFetch(`/collaboration/notes/${id}`, { method: 'DELETE' });
      setComments((list) => list?.filter((c) => c.id !== id) ?? null);
      setConfirming(null);
    } catch (err) {
      setRemoveError({ id, text: message(err, 'The comment could not be deleted.') });
    } finally {
      setRemoving(null);
    }
  }

  if (refused) return null;

  return (
    <div className="min-w-0 space-y-4" data-testid="task-comments">
      <p className="text-[11px] text-muted">Internal — clients never see these comments.</p>

      {loadError && (
        <div role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-3 py-2">
          <p className="text-xs text-danger">Comments could not be loaded. {loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Try again
          </button>
        </div>
      )}
      {!loadError && comments === null && <p className="text-xs text-muted">Loading comments…</p>}
      {!loadError && comments !== null && comments.length === 0 && <p className="text-xs text-muted">No comments yet. Write the first one below.</p>}

      {comments !== null && comments.length > 0 && (
        <ol aria-label="Comments" className="space-y-4">
          {comments.map((c) => {
            const mine = c.createdBy?.id === me?.id;
            return (
              <li key={c.id} className="flex min-w-0 gap-3">
                <div
                  aria-hidden="true"
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: avatarColor(c.createdBy?.id ?? 'unknown') }}
                >
                  {getInitials(c.createdBy?.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-semibold text-ink [overflow-wrap:anywhere]">{c.createdBy?.displayName ?? 'Former member'}</span>
                    <span className="text-[11px] text-muted">{when(c.createdAt)}{wasEdited(c) || editedHere.has(c.id) ? ' · edited' : ''}</span>
                  </div>

                  {editing === c.id ? (
                    <CommentBox
                      label="Edit comment"
                      submitLabel="Save"
                      busyLabel="Saving…"
                      autoFocus
                      members={members}
                      initialText={plainBody(c.body)}
                      initialPicked={mentionsIn(c.body)}
                      onMembersNeeded={askMembers}
                      onSubmit={(body) => save(c.id, body)}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <CommentText comment={c} />
                  )}

                  {editing !== c.id && (mine || leads) && (
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px]">
                      {mine && (
                        <button type="button" onClick={() => { setEditing(c.id); setConfirming(null); }} className="text-muted hover:text-ink">
                          Edit
                        </button>
                      )}
                      {confirming === c.id ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-700">Delete this comment?</span>
                          <button type="button" disabled={removing === c.id} onClick={() => void remove(c.id)} className="font-semibold text-danger hover:underline">
                            {removing === c.id ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button type="button" onClick={() => { setConfirming(null); setRemoveError(null); }} className="text-muted hover:text-ink">Keep</button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setConfirming(c.id)} className="text-muted hover:text-danger">
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                  {removeError?.id === c.id && <p role="alert" className="mt-1 text-[11px] text-danger">{removeError.text}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {comments !== null && (
        <CommentBox
          label="Write a comment"
          submitLabel="Comment"
          busyLabel="Sending…"
          members={members}
          onMembersNeeded={askMembers}
          onSubmit={add}
        />
      )}
    </div>
  );
}
