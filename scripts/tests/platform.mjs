import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const directory = await mkdtemp(path.join(os.tmpdir(), 'defaultstack-test-'));
const port = 3197;
const base = `http://127.0.0.1:${port}`;

function requestWithHost(host) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: '/', method: 'GET', headers: { host, accept: 'text/html' } }, res => {
      res.resume();
      resolve({ status: res.statusCode, headers: res.headers });
    });
    req.on('error', reject);
    req.end();
  });
}
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
  const homeResponse = await fetch(base);
  const homepage = await homeResponse.text();
  assert.equal(homeResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(homeResponse.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(homeResponse.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(homeResponse.headers.get('permissions-policy') || '', /camera=\(\).*microphone=\(\).*geolocation=\(\)/);
  const csp = homeResponse.headers.get('content-security-policy') || '';
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /form-action 'self' https:\/\/www\.defaultstackr\.cloud/);
  assert.match(csp, /connect-src 'self' https:\/\/www\.defaultstackr\.cloud/);
  assert.equal(homeResponse.headers.get('strict-transport-security'), null);
  assert.equal(homeResponse.headers.get('x-powered-by'), null);
  const asset = await fetch(`${base}/stripe-wordmark-white.svg`);
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get('x-content-type-options'), 'nosniff');
  const cloudHost = await requestWithHost('www.defaultstackr.cloud');
  assert.equal(cloudHost.status, 200);
  assert.equal(cloudHost.headers['strict-transport-security'], 'max-age=63072000');
  assert.equal(cloudHost.headers['x-frame-options'], 'SAMEORIGIN');
  const apexHost = await requestWithHost('defaultstackr.cloud');
  assert.equal(apexHost.headers['strict-transport-security'], 'max-age=63072000');
  const vercelHost = await requestWithHost('defaultstackr.nl');
  assert.equal(vercelHost.headers['strict-transport-security'], undefined);
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
