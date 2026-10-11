/**
 * Shared source assertions for the sprint baseline suites (MAOS-T39).
 *
 * The early baselines asserted a skeleton design that was later replaced:
 * repositories extending a TenantAwareRepository base class, controllers
 * reading the tenant from request headers, guards declared as
 * @UseGuards(PermissionGuard) alone. The current code enforces the same
 * properties differently, and more strictly. These helpers state the current
 * invariants so the baselines check what is true today:
 *
 *   - every Prisma query in a repository carries a tenant boundary;
 *   - every protected controller authenticates first and then checks
 *     permissions, and never takes its tenant from request headers.
 */

const QUERY_OPS = [
  'findMany', 'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow',
  'update', 'updateMany', 'upsert', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy',
  'create', 'createMany',
];

/** Returns the text of the balanced (...) argument list that starts at `open`. */
function argumentsAt(source, open) {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const c = source[i];
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return source.slice(open + 1);
}

/**
 * Every `prisma.<model>.<op>(...)` / `tx.<model>.<op>(...)` call whose
 * arguments never mention `tenantId`. Returns `model.op` descriptions.
 */
export function queriesWithoutTenant(source) {
  const found = [];
  const call = new RegExp(`\\b(?:prisma|tx)\\.(\\w+)\\.(${QUERY_OPS.join('|')})\\(`, 'g');
  let m;
  while ((m = call.exec(source)) !== null) {
    const args = argumentsAt(source, m.index + m[0].length - 1);
    if (!/\btenantId\b/.test(args)) found.push(`${m[1]}.${m[2]}`);
  }
  return found;
}

/** Repositories must scope every query to a tenant (see queriesWithoutTenant). */
export function assertTenantScopedRepository(assert, source, path, allowed = []) {
  const unscoped = queriesWithoutTenant(source).filter((q) => !allowed.includes(q));
  assert.deepEqual(unscoped, [], `${path}: queries without a tenantId boundary: ${unscoped.join(', ')}`);
}

/** Protected controllers: authentication, then permissions; tenant from the session only. */
export function assertGuardedController(assert, source, path) {
  assert.match(source, /@UseGuards\(JwtAuthGuard, PermissionGuard\)/, `${path} must authenticate, then check permissions`);
  assert.match(source, /@RequirePermission\(/, `${path} must declare permission requirements`);
  assert.match(source, /@CurrentUser\(\)/, `${path} must take the tenant from the authenticated user`);
  assert.doesNotMatch(source, /tenantContextFromHeaders|headers\[['"]x-tenant-id['"]\]/, `${path} must not read the tenant from request headers`);
}
