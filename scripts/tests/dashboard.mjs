import { spawn } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import assert from 'node:assert/strict';

const port = 3198;
const base = `http://127.0.0.1:${port}`;
const password = 'dashboard-test-password';
const apiKey = 'super-secret-api-key';
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
const passwordHash = `scrypt$16384$8$1$${salt.toString('base64url')}$${hash.toString('base64url')}`;
const server = spawn(process.execPath, ['scripts/start-standalone.mjs'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    BIND_HOST: '127.0.0.1',
    ENABLE_LOCAL_DATABASE_EDITOR: 'false',
    DEFAULTSTACKR_MOCK: 'true',
    DEFAULTSTACKR_API_URL: 'http://127.0.0.1:3000',
    DEFAULTSTACKR_API_KEY: apiKey,
    DEFAULTSTACKR_PUBLIC_URL: base,
    DEFAULTSTACKR_ADMIN_PASSWORD_HASH: passwordHash,
    DEFAULTSTACKR_SESSION_SECRET: 'test-session-secret-value',
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let errors = '';
server.stderr.on('data', chunk => { errors += chunk; });

function cookieHeader(response) {
  const lines = response.headers.getSetCookie?.() ?? [];
  const session = lines.find(line => line.startsWith('ds_session='));
  assert.ok(session, 'session cookie is set');
  assert.match(session, /HttpOnly/i);
  assert.doesNotMatch(session, /super-secret|dashboard-test-password/);
  return session.split(';')[0];
}

try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { ready = (await fetch(`${base}/healthz`)).ok; } catch { /* Starting */ }
    if (ready) break;
    if (server.exitCode !== null) throw new Error(errors);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'server starts');
  assert.equal((await fetch(`${base}/api/stack/v1/projects`)).status, 401);

  const homepage = await (await fetch(base)).text();
  assert.match(homepage, /milestone-badge/);
  assert.doesNotMatch(homepage, /API foundationIn testing/);
  assert.doesNotMatch(homepage, new RegExp(apiKey));

  const denied = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ password: 'not-the-password' }),
  });
  assert.equal(denied.status, 401);

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ password }),
  });
  assert.equal(login.status, 200);
  const cookie = cookieHeader(login);
  const headers = { cookie, Origin: base };

  const customerLogin = await fetch(`${base}/app/login?provider=github`, { headers: { cookie }, redirect: 'manual' });
  assert.equal(customerLogin.status, 200, 'an admin session must not intercept customer login');
  const customerHtml = await customerLogin.text();
  assert.match(customerHtml, /GitHub-aanmelding laden/);
  assert.doesNotMatch(customerHtml, /Verder met Google|Verder met GitHub|OF MET E-MAIL/);
  assert.doesNotMatch(customerHtml, /name="(?:email|password)"/);
  assert.doesNotMatch(await (await fetch(`${base}/app/login`)).text(), /Inloggen met GitHub/);
  const githubStart = await fetch(`${base}/api/auth/github`, { headers: { Accept: 'application/json' }, redirect: 'manual' });
  assert.equal(githubStart.status, 503);
  const githubStartBody = await githubStart.json();
  assert.equal(githubStartBody.error, 'GitHub-aanmelding is nog niet ingesteld.');
  const switchToCustomer = await fetch(`${base}/api/customer-entry/social`, {
    method: 'POST',
    headers: { cookie, Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'provider=github',
    redirect: 'manual',
  });
  assert.equal(switchToCustomer.status, 303);
  assert.equal(switchToCustomer.headers.get('location'), `${base}/app/login?result=unavailable`);
  assert.match(switchToCustomer.headers.get('set-cookie') || '', /ds_session=;.*Max-Age=0/i);
  const customerStatus = await fetch(`${base}/api/customer-entry/status`, { headers: { Origin: 'https://defaultstackr.nl' } });
  assert.equal(customerStatus.status, 200);
  assert.equal(customerStatus.headers.get('access-control-allow-origin'), 'https://defaultstackr.nl');
  const customerStatusBody = await customerStatus.json();
  assert.equal(customerStatusBody.available, false);
  assert.equal(customerStatusBody.githubSignIn, false);
  const publicSocial = await fetch(`${base}/api/customer-entry/social`, {
    method: 'POST', headers: { Origin: 'https://defaultstackr.nl', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'provider=github', redirect: 'manual',
  });
  assert.equal(publicSocial.status, 303, 'the public site must reach the customer login');
  assert.equal(publicSocial.headers.get('location'), `${base}/app/login?result=unavailable`);
  const publicEmail = await fetch(`${base}/api/customer-entry`, {
    method: 'POST', headers: { Origin: 'https://defaultstackr.online', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'mode=login&email=test%40example.com&password=long-test-password', redirect: 'manual',
  });
  assert.equal(publicEmail.status, 303);
  assert.equal(publicEmail.headers.get('location'), `${base}/app/login?result=unavailable`);
  const foreignSocial = await fetch(`${base}/api/customer-entry/social`, {
    method: 'POST', headers: { Origin: 'https://foreign.example', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'provider=github', redirect: 'manual',
  });
  assert.equal(foreignSocial.status, 403, 'other sites must not start a login');

  const projects = await (await fetch(`${base}/api/stack/v1/projects`, { headers })).json();
  assert.ok(projects.some(project => project.previewHostname === 'vitrine.defaultstackr.cloud'));
  assert.equal(projects.find(project => project.id === 'prj_vitrine').owner.name, 'CodedByDefault');
  assert.doesNotMatch(JSON.stringify(projects), new RegExp(apiKey));

  const domains = await (await fetch(`${base}/api/stack/v1/projects/prj_vitrine/domains`, { headers })).json();
  const codes = new Set(domains.map(domain => domain.check.code));
  for (const code of ['ok', 'wrong_record', 'propagation_pending', 'already_claimed']) assert.ok(codes.has(code), code);
  const statuses = new Set(domains.map(domain => domain.status));
  for (const status of ['pending_verification', 'verified', 'ssl_active', 'live']) assert.ok(statuses.has(status), status);
  const apex = domains.find(domain => domain.hostname === 'vitrine.nl');
  assert.equal(apex.redirect, 'apex_to_www');
  assert.ok(apex.records.some(record => record.type === 'CNAME' && record.flattening && record.host === '@'));
  assert.ok(apex.records.some(record => record.type === 'TXT' && record.fqdn === '_defaultstackr-verify.vitrine.nl'));
  assert.ok(domains.some(domain => domain.records.some(record => record.type === 'ALIAS')));
  assert.ok(domains.some(domain => domain.records.some(record => record.type === 'A')));
  assert.ok(domains.some(domain => domain.kind === 'subdomain' && domain.records.some(record => record.type === 'CNAME' && record.host !== '@')));

  const claim = await fetch(`${base}/api/stack/v1/projects/prj_notes/domains`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostname: 'bezet.nl', kind: 'apex', redirect: 'none' }),
  });
  assert.equal(claim.status, 409);
  assert.equal((await claim.json()).code, 'already_claimed');

  const created = await fetch(`${base}/api/stack/v1/projects/prj_vitrine/env`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'MAIL_TOKEN', value: 'env-secret-should-stay-hidden', environments: ['preview'] }),
  });
  assert.equal(created.status, 201);
  const createdBody = await created.text();
  assert.match(createdBody, /••••••••/);
  assert.doesNotMatch(createdBody, /env-secret-should-stay-hidden/);
  const envList = await (await fetch(`${base}/api/stack/v1/projects/prj_vitrine/env`, { headers })).text();
  assert.match(envList, /••••••••/);
  assert.doesNotMatch(envList, /super-secret-db-password|env-secret-should-stay-hidden|sk_live_mock/);
  assert.doesNotMatch(envList, new RegExp(apiKey));

  const app = await fetch(`${base}/app`, { headers: { cookie }, redirect: 'manual' });
  assert.equal(app.status, 200);
  const html = await app.text();
  assert.match(html, /Je projecten/);
  assert.doesNotMatch(html, new RegExp(apiKey));
  console.log('PASS: admin session, mock projects, DNS states, masked env vars');
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
}
