import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createSessionToken, readSession } from '../../src/lib/auth/session.ts';
import {
  accountLinkingOptions,
  accountOptions,
  authBaseURL,
  clearedGithubTokenFields,
  githubAccountHooks,
  githubDisplayName,
  githubProviderConfig,
  githubSignInRedirectUri,
  verifiedPrimaryGithubEmail,
} from '../../src/lib/auth/github-signin.mjs';

const clientSecret = 'github-test-client-secret';
const originalFetch = globalThis.fetch;

function emails(primaryVerified, extra = []) {
  return [{ email: 'Ada@Example.com', primary: true, verified: primaryVerified }, ...extra];
}

assert.equal(verifiedPrimaryGithubEmail(emails(true)), 'ada@example.com');
assert.equal(verifiedPrimaryGithubEmail(emails(false, [{ email: 'other@example.com', primary: false, verified: true }])), null);
assert.equal(verifiedPrimaryGithubEmail([{ email: 'ada@example.com', primary: true, verified: false }]), null);
assert.equal(verifiedPrimaryGithubEmail(null), null);
assert.equal(githubDisplayName({ name: 'Ada Lovelace', login: 'ada' }, 'ada@example.com'), 'Ada Lovelace');
assert.equal(githubDisplayName({ login: 'ada' }, 'ada@example.com'), 'ada');

process.env.GITHUB_CLIENT_ID = 'Iv1.testclient';
process.env.GITHUB_CLIENT_SECRET = clientSecret;
process.env.GITHUB_OAUTH_REDIRECT_BASE = 'https://defaultstack.vercel.app';
assert.equal(githubSignInRedirectUri(), 'https://defaultstack.vercel.app/api/auth/github/callback');
assert.equal(clearedGithubTokenFields({ providerId: 'credential', accessToken: 'keep' }), null);
assert.deepEqual(clearedGithubTokenFields({ providerId: 'github', accessToken: 'gho_drop' }), {
  accessToken: null, refreshToken: null, idToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null,
});

function database() {
  return { user: [], session: [], account: [], verification: [] };
}

function installFetch(script) {
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    if (url.startsWith('https://github.com/login/oauth/access_token')) {
      return Response.json({ access_token: 'gho_test_not_a_secret', token_type: 'bearer', scope: 'read:user,user:email' });
    }
    if (url === 'https://api.github.com/user') return Response.json(script.profile);
    if (url === 'https://api.github.com/user/emails') return Response.json(script.emails);
    return originalFetch(input, init);
  };
  return calls;
}

function createAuth(db) {
  const github = githubProviderConfig();
  assert.ok(github, 'provider config');
  const hooks = githubAccountHooks();
  return betterAuth({
    baseURL: authBaseURL(),
    secret: 'test-auth-secret-value-32chars-min',
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 200 },
    socialProviders: { github },
    account: accountOptions(),
    ...(hooks ? { databaseHooks: hooks } : {}),
    rateLimit: { enabled: false },
    logger: { disabled: true },
    trustedOrigins: [authBaseURL()],
  });
}

function cookieHeader(response) {
  return response.headers.getSetCookie().map(line => line.split(';')[0]).join('; ');
}

async function start(auth) {
  const response = await auth.handler(new Request(`${authBaseURL()}/api/auth/sign-in/social`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: authBaseURL() },
    body: JSON.stringify({ provider: 'github', callbackURL: '/app', errorCallbackURL: '/app/login', disableRedirect: true }),
  }));
  const payload = await response.json();
  return { response, payload };
}

async function callback(auth, startResponse, state, code = 'test-code') {
  return auth.handler(new Request(`${authBaseURL()}/api/auth/callback/github?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
    headers: { cookie: cookieHeader(startResponse) },
  }));
}

const httpsDb = database();
const httpsAuth = createAuth(httpsDb);
const httpsStart = await start(httpsAuth);
const authorize = new URL(httpsStart.payload.url);
assert.equal(`${authorize.origin}${authorize.pathname}`, 'https://github.com/login/oauth/authorize');
assert.equal(authorize.searchParams.get('scope'), 'read:user user:email');
assert.equal(authorize.searchParams.has('repo'), false);
assert.equal(authorize.searchParams.get('redirect_uri'), 'https://defaultstack.vercel.app/api/auth/github/callback');
assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
assert.ok(authorize.searchParams.get('code_challenge'));
assert.ok(authorize.searchParams.get('state'));
assert.equal(authorize.searchParams.get('client_id'), 'Iv1.testclient');
assert.equal(authorize.searchParams.has('client_secret'), false);
assert.equal(httpsStart.payload.url.includes(clientSecret), false);
const stateCookie = httpsStart.response.headers.getSetCookie().find(line => line.includes('oauth_state='));
assert.ok(stateCookie, 'state cookie is set');
assert.match(stateCookie, /HttpOnly/i);
assert.match(stateCookie, /SameSite=Lax/i);
assert.match(stateCookie, /Secure/i);
assert.match(stateCookie, /Max-Age=600/i);
assert.equal(stateCookie.includes(clientSecret), false);

const mismatchCalls = installFetch({ profile: { id: 42, login: 'ada', name: 'Ada' }, emails: emails(true) });
const mismatch = await callback(httpsAuth, httpsStart.response, 'not-the-state');
assert.equal(mismatch.status, 302);
assert.match(mismatch.headers.get('location') || '', /error=state_/);
assert.equal(mismatchCalls.some(url => url.includes('access_token')), false);
assert.equal(httpsDb.user.length, 0);
assert.equal(mismatch.headers.getSetCookie().some(line => line.startsWith('ds_session=') && !line.startsWith('ds_session=;')), false);

process.env.GITHUB_OAUTH_REDIRECT_BASE = 'http://localhost:3000';
assert.equal(githubSignInRedirectUri(), 'http://localhost:3000/api/auth/github/callback');

async function finish(script) {
  const db = database();
  const auth = createAuth(db);
  const calls = installFetch(script);
  const begun = await start(auth);
  const state = new URL(begun.payload.url).searchParams.get('state');
  assert.equal(new URL(begun.payload.url).searchParams.get('redirect_uri'), 'http://localhost:3000/api/auth/github/callback');
  const done = await callback(auth, begun.response, state);
  return { db, done, calls, begun };
}

const unverified = await finish({
  profile: { id: 7, login: 'ada', name: 'Ada', site_admin: true },
  emails: emails(false, [{ email: 'other@example.com', primary: false, verified: true }]),
});
assert.match(unverified.done.headers.get('location') || '', /error=unable_to_get_user_info/);
assert.equal(unverified.db.user.length, 0);
assert.equal(unverified.db.account.length, 0);
assert.equal(unverified.done.headers.getSetCookie().some(line => /session_token=[^;]/.test(line) && !/Max-Age=0/i.test(line)), false);

const created = await finish({
  profile: { id: 42, login: 'ada', name: 'Ada Lovelace', avatar_url: 'https://avatars.githubusercontent.com/u/42', site_admin: true },
  emails: emails(true),
});
assert.match(created.done.headers.get('location') || '', /\/app$/);
assert.equal(created.db.user.length, 1);
assert.equal(created.db.user[0].email, 'ada@example.com');
assert.equal(created.db.user[0].emailVerified, true);
assert.equal(created.db.user[0].name, 'Ada Lovelace');
assert.equal(created.db.user[0].role, undefined);
assert.notEqual(created.db.user[0].site_admin, true);
assert.equal(created.db.account.length, 1);
assert.equal(created.db.account[0].providerId, 'github');
assert.equal(created.db.account[0].accountId, '42');
assert.equal(created.db.account[0].userId, created.db.user[0].id);
assert.equal(created.db.account[0].accessToken ?? null, null);
assert.equal(created.db.account[0].refreshToken ?? null, null);
assert.equal(created.db.account[0].idToken ?? null, null);
const sessionCookie = created.done.headers.getSetCookie().find(line => line.includes('session_token='));
assert.ok(sessionCookie);
const sessionValue = decodeURIComponent(sessionCookie.split(';')[0].slice(sessionCookie.indexOf('=') + 1));
assert.equal(await readSession(sessionValue, 'test-session-secret-value'), false);
assert.equal(await readSession(await createSessionToken('test-session-secret-value'), 'test-session-secret-value'), true);
assert.equal(created.done.headers.getSetCookie().some(line => line.startsWith('ds_session=') && !line.startsWith('ds_session=;')), false);

async function signUp(auth, db, email, verified) {
  const response = await auth.api.signUpEmail({
    body: { name: 'Bestaand', email, password: 'long-password-1' },
    headers: new Headers({ origin: authBaseURL() }),
  });
  assert.equal(response.user.email, email);
  if (verified) db.user.find(user => user.email === email).emailVerified = true;
}

const linkDb = database();
const linkAuth = createAuth(linkDb);
await signUp(linkAuth, linkDb, 'ada@example.com', true);
installFetch({ profile: { id: 99, login: 'ada', name: 'Ada' }, emails: emails(true) });
const linkStart = await start(linkAuth);
const linkDone = await callback(linkAuth, linkStart.response, new URL(linkStart.payload.url).searchParams.get('state'));
assert.match(linkDone.headers.get('location') || '', /\/app$/);
assert.equal(linkDb.user.length, 1);
assert.equal(linkDb.account.filter(account => account.providerId === 'github').length, 1);
assert.equal(linkDb.account.find(account => account.providerId === 'github').accountId, '99');
assert.equal(linkDb.account.find(account => account.providerId === 'github').userId, linkDb.user[0].id);
assert.equal(linkDb.account.find(account => account.providerId === 'github').accessToken ?? null, null);

const again = await start(linkAuth);
installFetch({ profile: { id: 99, login: 'ada', name: 'Ada' }, emails: [{ email: 'other@example.com', primary: true, verified: true }] });
const againDone = await callback(linkAuth, again.response, new URL(again.payload.url).searchParams.get('state'));
assert.match(againDone.headers.get('location') || '', /\/app$/);
assert.equal(linkDb.user.length, 1);
assert.equal(linkDb.user[0].email, 'ada@example.com');

const unverifiedLocal = database();
const unverifiedAuth = createAuth(unverifiedLocal);
await signUp(unverifiedAuth, unverifiedLocal, 'ada@example.com', false);
installFetch({ profile: { id: 100, login: 'ada', name: 'Ada' }, emails: emails(true) });
const refusedStart = await start(unverifiedAuth);
const refused = await callback(unverifiedAuth, refusedStart.response, new URL(refusedStart.payload.url).searchParams.get('state'));
assert.match(refused.headers.get('location') || '', /error=account_not_linked/);
assert.equal(unverifiedLocal.user.length, 1);
assert.equal(unverifiedLocal.account.some(account => account.providerId === 'github'), false);
assert.equal(refused.headers.getSetCookie().some(line => /session_token=[^;]/.test(line) && !/Max-Age=0/i.test(line)), false);

globalThis.fetch = originalFetch;
assert.deepEqual(accountLinkingOptions(), { enabled: true, disableImplicitLinking: false, requireLocalEmailVerified: true });

const port = 3194;
const base = `http://127.0.0.1:${port}`;
const salt = randomBytes(16);
const hash = scryptSync('dashboard-test-password', salt, 32, { N: 16384, r: 8, p: 1 });
const passwordHash = `scrypt$16384$8$1$${salt.toString('base64url')}$${hash.toString('base64url')}`;
process.env.GITHUB_OAUTH_REDIRECT_BASE = 'https://defaultstack.vercel.app';
const server = spawn(process.execPath, ['scripts/start-standalone.mjs'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    BIND_HOST: '127.0.0.1',
    ENABLE_LOCAL_DATABASE_EDITOR: 'false',
    DEFAULTSTACKR_MOCK: 'true',
    DEFAULTSTACKR_PUBLIC_URL: base,
    DEFAULTSTACKR_ADMIN_PASSWORD_HASH: passwordHash,
    DEFAULTSTACKR_SESSION_SECRET: 'test-session-secret-value',
    GITHUB_CLIENT_ID: 'Iv1.testclient',
    GITHUB_CLIENT_SECRET: clientSecret,
    GITHUB_OAUTH_REDIRECT_BASE: 'https://defaultstack.vercel.app',
    DEFAULTSTACKR_AUTH_DATABASE_URL: '',
    DEFAULTSTACKR_AUTH_SECRET: '',
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let errors = '';
server.stderr.on('data', chunk => { errors += chunk; });

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { ready = (await originalFetch(`${base}/healthz`)).ok; } catch { /* starting */ }
    if (ready) break;
    if (server.exitCode !== null) throw new Error(errors || 'server exited');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(ready, true);
  const login = await originalFetch(`${base}/app/login`);
  const html = await login.text();
  assert.match(html, /<a class="auth-social auth-social-github" href="https:\/\/defaultstack.vercel.app\/api\/auth\/github">/);
  assert.match(html, /Inloggen met GitHub/);
  assert.doesNotMatch(html, /<form[^>]+action="https:\/\/github\.com/);
  assert.equal(html.includes(clientSecret), false);
  const missing = await originalFetch(`${base}/api/auth/github`, { headers: { Accept: 'application/json' }, redirect: 'manual' });
  assert.equal(missing.status, 503);
  const missingBody = await missing.json();
  assert.equal(missingBody.error, 'GitHub-aanmelding is nog niet ingesteld.');
  assert.equal(JSON.stringify(missingBody).includes(clientSecret), false);
  const callbackResponse = await originalFetch(`${base}/api/auth/github/callback?code=test-code&state=wrong`, { redirect: 'manual' });
  assert.equal(callbackResponse.status, 303);
  assert.match(callbackResponse.headers.get('location') || '', /result=github_unavailable/);
  assert.equal(callbackResponse.headers.getSetCookie().some(line => line.startsWith('ds_session=') && !line.startsWith('ds_session=;')), false);
  const loginResponse = await originalFetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ password: 'dashboard-test-password' }),
  });
  assert.equal(loginResponse.status, 200);
  const adminCookie = loginResponse.headers.getSetCookie().find(line => line.startsWith('ds_session='));
  assert.ok(adminCookie);
  assert.match(adminCookie, /HttpOnly/i);
  assert.match(adminCookie, /SameSite=Lax/i);
  const adminToken = decodeURIComponent(adminCookie.split(';')[0].slice('ds_session='.length));
  assert.equal(await readSession(adminToken, 'test-session-secret-value'), true);
} finally {
  server.kill();
  globalThis.fetch = originalFetch;
}

console.log('github login tests passed');
