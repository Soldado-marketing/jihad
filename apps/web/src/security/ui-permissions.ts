import type { NavigationItem } from '@/navigation/navigation';
import type { WorkspaceRole } from '@/navigation/roles';

export type UiAccessResult = {
  allowed: boolean;
  reason: 'allowed' | 'role_not_allowed' | 'placeholder_only';
};

export function canViewNavigationItem(
  role: WorkspaceRole,
  item: NavigationItem,
): UiAccessResult {
  if (item.sprint2Status === 'deferred') {
    return { allowed: false, reason: 'placeholder_only' };
  }

  if (!item.allowedRoles.includes(role)) {
    return { allowed: false, reason: 'role_not_allowed' };
  }

  return { allowed: true, reason: 'allowed' };
}

export function filterNavigationItems(
  role: WorkspaceRole,
  items: NavigationItem[],
): NavigationItem[] {
  return items.filter((item) => canViewNavigationItem(role, item).allowed);
}

export function resolveRouteAccess(
  role: WorkspaceRole,
  allowedRoles: WorkspaceRole[],
): UiAccessResult {
  return allowedRoles.includes(role)
    ? { allowed: true, reason: 'allowed' }
    : { allowed: false, reason: 'role_not_allowed' };
}

// UI helpers improve usability only. Backend guards remain the source of truth for authorization.
