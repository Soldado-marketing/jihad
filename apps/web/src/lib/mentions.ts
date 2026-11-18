/**
 * Mentions in task comments (MAOS G07).
 *
 * A stored comment carries a mention as a token, `@[Display Name](user:<id>)`;
 * the server checks every token and writes the member's real name into it.
 * While someone writes, the box holds plain text ("@Display Name") and the
 * composer remembers who was picked; the tokens are put in when the comment is
 * sent. Everything here is plain string work, so it is tested without a browser.
 */

export type Mentionable = { id: string; displayName: string };

export type BodyPart = { text: string; mention?: Mentionable };

const TOKEN = /@\[([^\[\]\n]{1,120})\]\(user:([A-Za-z0-9_-]{1,64})\)/g;

/** A stored comment split into plain text and mentions, in order. */
export function bodyParts(body: string): BodyPart[] {
  const parts: BodyPart[] = [];
  let at = 0;
  for (const match of body.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > at) parts.push({ text: body.slice(at, start) });
    parts.push({ text: `@${match[1]}`, mention: { id: match[2], displayName: match[1] } });
    at = start + match[0].length;
  }
  if (at < body.length) parts.push({ text: body.slice(at) });
  return parts;
}

/** A stored comment as plain text: every mention reads "@Name". */
export function plainBody(body: string): string {
  return bodyParts(body).map((p) => p.text).join('');
}

/** The people a stored comment mentions, each once. For opening a comment in the box again. */
export function mentionsIn(body: string): Mentionable[] {
  const seen = new Map<string, Mentionable>();
  for (const part of bodyParts(body)) {
    if (part.mention && !seen.has(part.mention.id)) seen.set(part.mention.id, part.mention);
  }
  return [...seen.values()];
}

/**
 * The name being typed after an "@" that ends at the caret, or null when the
 * caret is not inside one. The "@" must start the text or follow a space, a
 * line break or an opening bracket, so an e-mail address is not a mention.
 */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf('@');
  if (start < 0) return null;
  if (start > 0 && !/[\s(]/.test(before[start - 1])) return null;
  const query = before.slice(start + 1);
  // A space right before the caret closes it: the name just picked is not offered again.
  if (query.length > 40 || query.includes('\n') || /\s{2,}|\s$/.test(query)) return null;
  return { start, query };
}

/** The members whose name contains what was typed, names that start with it first. */
export function matchingMembers(members: Mentionable[], query: string, limit = 6): Mentionable[] {
  const q = query.trim().toLowerCase();
  const hits = members.filter((m) => m.displayName.toLowerCase().includes(q));
  const starts = (m: Mentionable) => (m.displayName.toLowerCase().startsWith(q) ? 0 : 1);
  return hits.sort((a, b) => starts(a) - starts(b) || a.displayName.localeCompare(b.displayName)).slice(0, limit);
}

/** The text with the "@query" at the caret replaced by "@Name ", and where the caret goes. */
export function insertMention(text: string, caret: number, member: Mentionable): { text: string; caret: number } {
  const open = mentionQuery(text, caret);
  const start = open ? open.start : caret;
  const inserted = `@${member.displayName} `;
  return { text: text.slice(0, start) + inserted + text.slice(caret), caret: start + inserted.length };
}

/**
 * What is sent: every "@Name" of a picked member becomes that member's token.
 * Longer names go first, so "@Ana Maria" is not taken for "@Ana". A picked
 * member whose name was deleted from the text again is simply not mentioned.
 */
export function withMentionTokens(text: string, picked: Mentionable[]): string {
  const byLength = [...new Map(picked.map((m) => [m.id, m])).values()]
    .sort((a, b) => b.displayName.length - a.displayName.length);
  let parts: (string | Mentionable)[] = [text];
  for (const member of byLength) {
    const needle = `@${member.displayName}`;
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return [part];
      const out: (string | Mentionable)[] = [];
      let rest = part;
      for (let i = rest.indexOf(needle); i >= 0; i = rest.indexOf(needle)) {
        const after = rest[i + needle.length];
        // "@Ana" must not match inside "@Anabel".
        if (after !== undefined && /[\p{L}\p{N}_]/u.test(after)) {
          out.push(rest.slice(0, i + needle.length));
          rest = rest.slice(i + needle.length);
          continue;
        }
        out.push(rest.slice(0, i), member);
        rest = rest.slice(i + needle.length);
      }
      out.push(rest);
      return out;
    });
  }
  return parts.map((p) => (typeof p === 'string' ? p : `@[${p.displayName.replace(/[\[\]\n]/g, ' ')}](user:${p.id})`)).join('');
}
