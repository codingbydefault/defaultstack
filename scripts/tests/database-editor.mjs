import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import assert from 'node:assert/strict';

const password = 'database-editor-test-password';
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
const passwordHash = `scrypt$16384$8$1$${salt.toString('base64url')}$${hash.toString('base64url')}`;
const hits = [];

const upstream = createServer((request, response) => {
  const chunks = [];
  request.on('data', chunk => chunks.push(chunk));
  request.on('end', () => {
    hits.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization || '',
      cookie: request.headers.cookie || '',
      body: Buffer.concat(chunks).toString('utf8'),
    });
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify([{ id: 1, name: 'Ada' }]));
  });
});

await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
const upstreamPort = upstream.address().port;
const port = 3196;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/start-standalone.mjs'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    BIND_HOST: '127.0.0.1',
    ENABLE_LOCAL_DATABASE_EDITOR: 'true',
    DATABASE_API_URL: `http://127.0.0.1:${upstreamPort}`,
    DEFAULTSTACKR_ADMIN_PASSWORD_HASH: passwordHash,
    DEFAULTSTACKR_SESSION_SECRET: 'test-session-secret-value',
    DEFAULTSTACKR_MOCK: 'false',
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let errors = '';
server.stderr.on('data', chunk => { errors += chunk; });

function cookieHeader(response) {
  const lines = response.headers.getSetCookie?.() ?? [];
  const session = lines.find(line => line.startsWith('ds_session='));
  assert.ok(session, 'session cookie is set');
  return session.split(';')[0];
}

try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { ready = (await fetch(`${base}/healthz`)).ok; } catch { /* Starting */ }
    if (ready) break;
    if (server.exitCode !== null) throw new Error(errors || 'server exited');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'server starts');

  const anonymous = await fetch(`${base}/api/data/users`);
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get('cache-control') || '', /no-store/);
  const forged = await fetch(`${base}/api/data/users`, { headers: { cookie: 'ds_session=aaaa.bbbb' } });
  assert.equal(forged.status, 401);
  const customerCookie = await fetch(`${base}/api/data/products`, {
    headers: { cookie: 'better-auth.session_token=not-a-session' },
  });
  assert.equal(customerCookie.status, 401);
  const anonymousWrite = await fetch(`${base}/api/data/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ name: 'should-not-forward' }),
  });
  assert.equal(anonymousWrite.status, 401);
  assert.equal(hits.length, 0, 'anonymous requests must not reach the database API');

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ password }),
  });
  assert.equal(login.status, 200);
  const cookie = cookieHeader(login);

  const loaded = await fetch(`${base}/api/data/users`, { headers: { cookie } });
  assert.equal(loaded.status, 200);
  assert.deepEqual(await loaded.json(), [{ id: 1, name: 'Ada' }]);
  assert.equal(hits.at(-1).url, '/api/users');
  assert.equal(hits.at(-1).authorization, '');
  assert.equal(hits.at(-1).cookie, '');

  const invalid = await fetch(`${base}/api/data/secrets`, { headers: { cookie } });
  assert.equal(invalid.status, 400);
  assert.equal(hits.length, 1, 'invalid tables must not be forwarded');

  const crossSite = await fetch(`${base}/api/data/users`, {
    method: 'POST',
    headers: { cookie, Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'cross-site' }),
  });
  assert.equal(crossSite.status, 403);
  assert.equal(hits.length, 1, 'cross-site writes must not be forwarded');

  const created = await fetch(`${base}/api/data/users`, {
    method: 'POST',
    headers: { cookie, Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Grace' }),
  });
  assert.equal(created.status, 200);
  assert.equal(hits.at(-1).method, 'POST');
  assert.equal(hits.at(-1).body, JSON.stringify({ name: 'Grace' }));
  console.log('PASS: database editor requires admin session and blocks anonymous and cross-site writes');
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
  await new Promise(resolve => upstream.close(resolve));
}
