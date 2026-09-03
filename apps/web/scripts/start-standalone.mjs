#!/usr/bin/env node
/**
 * Production start for `output: 'standalone'`.
 *
 * `next start` prints:
 *   "next start" does not work with "output: standalone" configuration.
 *   Use "node .next/standalone/server.js" instead.
 *
 * The standalone bundle carries the server and its traced node_modules, but
 * Next deliberately leaves `.next/static` and `public` out of it — the Dockerfile
 * copies them in as separate layers. Outside Docker nothing does that, so the
 * server would boot and then 404 every asset. This mirrors those two Docker COPY
 * steps and then runs the same entrypoint the image runs.
 *
 * Local development is unaffected: `npm run dev` still uses `next dev`.
 */
import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const standalone = join(webRoot, '.next', 'standalone');
const server = join(standalone, 'server.js');

if (!existsSync(server)) {
  console.error(
    'Standalone build not found at .next/standalone/server.js — run `npm run build` first.',
  );
  process.exit(1);
}

// Same two artefacts the Dockerfile copies into the production stage.
for (const [from, to] of [
  [join(webRoot, '.next', 'static'), join(standalone, '.next', 'static')],
  [join(webRoot, 'public'), join(standalone, 'public')],
]) {
  if (existsSync(from)) {
    cpSync(from, to, { recursive: true });
  }
}

const child = spawn(process.execPath, [server], {
  cwd: standalone,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
