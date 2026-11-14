import { lookup } from 'node:dns/promises';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
export async function checkPublication(name, dependencies = {}) {
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(name)) throw new Error('Invalid app name');
  const host = `${name}.defaultstackr.cloud`;
  const url = `https://${host}`;
  const result = { url, status: 'pending-dns', checkedAt: new Date().toISOString() };
  try { await (dependencies.lookup || lookup)(host); } catch { return result; }
  result.status = 'pending-https';
  try {
    const response = await (dependencies.fetch || fetch)(`${url}/healthz`, { signal: AbortSignal.timeout(10000), redirect: 'error', headers: { 'Cache-Control': 'no-cache' } });
    if (response.headers.get('X-DefaultStack-Route') !== host) result.status = 'pending-route';
    else result.status = response.ok ? 'ready' : 'unhealthy';
    await response.body?.cancel();
  } catch { /* TLS, network or redirect not ready; never bypass verification. */ }
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const name = process.argv[2] || '';
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(name)) throw new Error('Usage: node deploy/apps/check-publication.mjs <app-name>');
  const [container] = JSON.parse(execFileSync('docker', ['inspect', `defaultstack-app-${name}`], { encoding: 'utf8', timeout: 10000 }));
  const result = await checkPublication(name);
  const directory = process.env.DEFAULTSTACK_STATE_DIR || path.join(os.homedir(), '.local/state/defaultstack');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(directory, `${name}-publication-${process.pid}.tmp`);
  writeFileSync(temporary, JSON.stringify({ ...result, image: container.Config.Image }), { mode: 0o600 });
  renameSync(temporary, path.join(directory, `${name}-publication.json`));
  console.log(`${name}: ${result.status} — ${result.url}`);
  if (result.status !== 'ready') process.exitCode = 2;
}
