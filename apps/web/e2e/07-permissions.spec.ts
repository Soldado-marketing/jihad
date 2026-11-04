import { expect, test } from '@playwright/test';
import { call } from './support/api';
import { readSeed } from './support/seed';

const s = readSeed();

/**
 * Permission matrix at the API, per role, for the routes the browser specs
 * exercise. Read-only calls, so it runs in both viewport projects unchanged.
 */
const matrix: { route: string; owner: number; manager: number; employee: number; client: number }[] = [
  { route: '/projects',            owner: 200, manager: 200, employee: 200, client: 403 },
  { route: '/tasks',               owner: 200, manager: 200, employee: 200, client: 403 },
  { route: '/files',               owner: 200, manager: 200, employee: 200, client: 403 },
  { route: '/customers',           owner: 200, manager: 200, employee: 200, client: 403 },
  { route: '/leads',               owner: 200, manager: 200, employee: 403, client: 403 },
  { route: '/invoices',            owner: 200, manager: 403, employee: 403, client: 403 },
  { route: '/finance/summary',     owner: 200, manager: 403, employee: 403, client: 403 },
  { route: '/audit-events',        owner: 200, manager: 403, employee: 403, client: 403 },
  { route: '/auth/company-members', owner: 200, manager: 403, employee: 403, client: 403 },
  { route: '/requests',            owner: 200, manager: 200, employee: 403, client: 403 },
  { route: '/client/projects',     owner: 200, manager: 200, employee: 403, client: 200 },
  { route: '/client/deliveries',   owner: 200, manager: 200, employee: 403, client: 200 },
  { route: '/client/invoices',     owner: 200, manager: 403, employee: 403, client: 200 },
  { route: '/client/requests',     owner: 403, manager: 403, employee: 403, client: 200 },
];

test.describe('Permission matrix (API)', () => {
  for (const row of matrix) {
    test(`GET ${row.route}: owner ${row.owner}, manager ${row.manager}, employee ${row.employee}, client ${row.client}`, async () => {
      const got = {
        owner: (await call(row.route, { token: s.sessions.owner.tokens.accessToken })).status,
        manager: (await call(row.route, { token: s.sessions.manager.tokens.accessToken })).status,
        employee: (await call(row.route, { token: s.sessions.employee.tokens.accessToken })).status,
        client: (await call(row.route, { token: s.sessions.clientOne.tokens.accessToken })).status,
      };
      expect(got).toEqual({ owner: row.owner, manager: row.manager, employee: row.employee, client: row.client });
    });
  }
});
