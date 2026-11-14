import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const directory = await mkdtemp(path.join(os.tmpdir(), 'build-api-test-'));
const id = 'hello-20261114000000-123';
await mkdir(path.join(directory, 'builds'));
await writeFile(path.join(directory, 'builds', `${id}.json`), JSON.stringify({ id, app: 'hello', status: 'ready', image: 'defaultstack/hello:test', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), secret: 'do not expose' }));
await writeFile(path.join(directory, 'builds', `${id}.log`), 'x'.repeat(70000) + '\x1b[32mBuild complete\x1b[0m');
const server = spawn(process.execPath, ['scripts/start-standalone.mjs'], { env: { ...process.env, PORT: '3196', BIND_HOST: '127.0.0.1', DEFAULTSTACK_STATE_DIR: directory, ENABLE_LOCAL_BUILD_LOGS: 'true' }, stdio: 'ignore' });
const base = 'http://127.0.0.1:3196';
try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { ready = (await fetch(`${base}/healthz`)).ok; } catch {} if (ready) break; if (server.exitCode !== null) throw new Error('Server failed'); await new Promise(r => setTimeout(r, 250)); }
  assert(ready);
  const list = await (await fetch(`${base}/api/builds`)).json();
  assert.equal(list.builds[0].id, id); assert(!JSON.stringify(list).includes('do not expose'));
  const response = await fetch(`${base}/api/builds/${id}`);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const detail = await response.json();
  assert(detail.log.truncated); assert(detail.log.text.endsWith('Build complete')); assert(detail.log.text.length <= 65536); assert(!detail.log.text.includes('\x1b'));
  assert.equal((await fetch(`${base}/api/builds/invalid`)).status, 400);
  assert.equal((await fetch(`${base}/api/builds/missing-20261114000000-123`)).status, 404);
  console.log('PASS: build list/detail whitelist, bounded log tail, ANSI stripping and invalid/missing build IDs');
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
  await rm(directory, { recursive: true, force: true });
}
