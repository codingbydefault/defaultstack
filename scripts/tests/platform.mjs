import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const directory = await mkdtemp(path.join(os.tmpdir(), 'defaultstack-test-'));
const port = 3197;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/start-standalone.mjs'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: String(port), BIND_HOST: '127.0.0.1', DEFAULTSTACK_STATE_DIR: directory, ENABLE_LOCAL_DATABASE_EDITOR: 'false' }, stdio: ['ignore', 'ignore', 'pipe'],
});
let errors = '';
server.stderr.on('data', chunk => { errors += chunk; });
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { ready = (await fetch(`${base}/healthz`)).ok; } catch { /* Starting */ }
    if (ready) break;
    if (server.exitCode !== null) throw new Error(errors);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'server starts');
  const appPage = await fetch(`${base}/app`, { redirect: 'manual' });
  assert.equal(appPage.status, 307);
  assert.match(appPage.headers.get('location') || '', /\/app\/login/);
  assert.equal((await fetch(`${base}/app/login`)).status, 200);
  const homepage = await (await fetch(base)).text();
  assert(homepage.includes('https://www.defaultstackr.cloud'), 'canonical domain matches');
  assert(!homepage.includes('defaultstackr.online'), 'mistaken .online domain removed');
  assert(!homepage.includes('defaultstack.online'), 'original domain removed');
  let response = await fetch(`${base}/api/platform`);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal((await response.json()).connected, false);
  const fixture = { generatedAt: new Date().toISOString(), secret: 'never expose', deployments: [{ name: 'hello', image: 'defaultstack/hello:test', state: 'running', health: 'healthy', port: 3200, created: new Date().toISOString(), secret: 'never expose' }] };
  await writeFile(path.join(directory, 'status.json'), JSON.stringify(fixture));
  const actual = await (await fetch(`${base}/api/platform`)).json();
  assert.equal(actual.connected, true); assert.equal(actual.stale, false); assert.equal(actual.deployments[0].name, 'hello'); assert(!JSON.stringify(actual).includes('never expose'));
  fixture.generatedAt = new Date(Date.now() - 180000).toISOString();
  await writeFile(path.join(directory, 'status.json'), JSON.stringify(fixture));
  assert.equal((await (await fetch(`${base}/api/platform`)).json()).stale, true);
  await writeFile(path.join(directory, 'status.json'), '{broken');
  assert.equal((await (await fetch(`${base}/api/platform`)).json()).connected, false);
  assert.equal((await fetch(`${base}/api/data/users`)).status, 503);
  console.log('PASS: production app, health, missing/valid/stale/corrupt snapshots, metadata whitelist, database disabled');
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
  await rm(directory, { recursive: true, force: true });
}
