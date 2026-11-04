import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Person, Session } from './api';

export const SEED_FILE = join(process.cwd(), '.playwright', 'seed.json');

/** What global-setup created for this run; every value is fictional and per run. */
export interface Seed {
  run: string;
  company: { slug: string; name: string };
  owner: Person;
  manager: Person;
  employee: Person;
  clientOne: Person;
  clientTwo: Person;
  customerOne: { id: string; name: string };
  customerTwo: { id: string; name: string };
  project: { id: string; name: string };
  internalProject: { id: string; name: string };
  sharedTask: { id: string; title: string };
  assignedTask: { id: string; title: string };
  appointment: { id: string; title: string; location: string };
  invoice: { id: string; number: string };
  /** One delivered file per viewport project, keyed by the Playwright project name. */
  files: Record<'desktop' | 'mobile', { id: string; name: string; versionId: string; deliveryId: string }>;
  other: { tenantSlug: string; tenantName: string; owner: Person; projectId: string; projectName: string };
  /** One signed-in session per person, taken at seed time; browser tests start from it instead of signing in again. */
  sessions: Record<'owner' | 'manager' | 'employee' | 'clientOne' | 'clientTwo' | 'otherOwner', Session>;
}

export const fileFor = (seed: Seed, projectName: string) => seed.files[projectName === 'mobile' ? 'mobile' : 'desktop'];

export function readSeed(): Seed {
  return JSON.parse(readFileSync(SEED_FILE, 'utf8')) as Seed;
}
