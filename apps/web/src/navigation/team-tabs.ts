/**
 * Team & Access (MAOS E01): the three sections under /team, in tab order. The
 * former Company Access, Invitations and User Requests pages render unchanged
 * under them; the old routes redirect here. The API still decides who may do
 * what (OWNER only).
 */
export const TEAM_TABS = [
  { href: '/team/members', label: 'Members & access' },
  { href: '/team/invitations', label: 'Invitations' },
  { href: '/team/requests', label: 'User requests' },
] as const;

export function isTeamTabActive(href: string, pathname: string | null): boolean {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}
