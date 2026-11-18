/**
 * Mentions inside a task comment (MAOS G07).
 *
 * No column holds a mention: it is a token in the comment's own text,
 * `@[Display Name](user:<id>)`. The id says who is meant, so a rename or two
 * members with the same name change nothing, and the thread can mark the
 * mention again after a reload. The name inside a token is never trusted: the
 * server writes the member's real name into it before the comment is stored.
 */

export const MAX_MENTIONS = 20;

const TOKEN = /@\[([^\[\]\n]{1,120})\]\(user:([A-Za-z0-9_-]{1,64})\)/g;

/** The ids mentioned in `body`, each once, in order of appearance. */
export function mentionedUserIds(body: string): string[] {
  const ids = new Set<string>();
  for (const match of body.matchAll(TOKEN)) ids.add(match[2]);
  return [...ids];
}

/** A name as it may stand inside a token: no brackets, no line break. */
function tokenName(name: string): string {
  return name.replace(/[\[\]\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Member';
}

/**
 * `body` with every known token carrying the member's real name, so a crafted
 * request cannot show one person's name over another person's id.
 */
export function withCanonicalNames(body: string, names: ReadonlyMap<string, string>): string {
  return body.replace(TOKEN, (token: string, _name: string, id: string) => {
    const name = names.get(id);
    return name === undefined ? token : `@[${tokenName(name)}](user:${id})`;
  });
}
