import { BadRequestException } from '@nestjs/common';

/**
 * Format of a client scope key: the string that ties a CLIENT membership to
 * its client's rows (Blueprint §4: the client authorization boundary until
 * the Customer migration). Letters, digits, dot, underscore and hyphen.
 */
export const CLIENT_SCOPE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

/**
 * The clientScopeKey to store for a membership with `role` (MAOS F-1).
 *
 * A CLIENT without a key is refused by the portal (fail closed), so approving
 * or moving someone into CLIENT requires one. No other role uses the key: it
 * is refused when sent and cleared when stored, so a former client keeps no
 * stale scope.
 */
export function clientScopeKeyForRole(role: string, clientScopeKey: string | undefined): string | null {
  if (role === 'CLIENT') {
    if (!clientScopeKey) {
      throw new BadRequestException({
        code: 'CLIENT_SCOPE_REQUIRED',
        message: 'A client must be assigned a clientScopeKey.',
      });
    }
    return clientScopeKey;
  }
  if (clientScopeKey !== undefined) {
    throw new BadRequestException({
      code: 'CLIENT_SCOPE_NOT_ALLOWED',
      message: 'clientScopeKey applies to the CLIENT role only.',
    });
  }
  return null;
}
