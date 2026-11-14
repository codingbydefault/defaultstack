import { mkdtemp, mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const root = await mkdtemp(path.join(os.tmpdir(), 'domain-sync-test-'));
try {
  for (const directory of ['bin', 'backups', 'etc/nginx/sites-available', 'etc/cloudflared']) await mkdir(path.join(root, directory), { recursive: true });
  // Exercise the real script in a disposable fixture, with service commands mocked.
  let source = await readFile('deploy/sync-domain.sh', 'utf8');
  source = source.replaceAll('/var/backups', `${root}/backups`).replaceAll('/etc/', `${root}/etc/`);
  const script = path.join(root, 'sync.sh');
  await writeFile(script, source);
  for (const [name, body] of Object.entries({ id: 'echo 0', nginx: 'test "${FAIL_NGINX:-0}" != 1', systemctl: 'exit 0', cloudflared: 'exit 0' })) {
    const file = path.join(root, 'bin', name);
    await writeFile(file, `#!/bin/sh\n${body}\n`); await chmod(file, 0o700);
  }
  const nginx = path.join(root, 'etc/nginx/sites-available/defaultstack.conf');
  const tunnel = path.join(root, 'etc/cloudflared/config.yml');
  const original = 'server_name www.defaultstack.online;\nproxy_pass http://127.0.0.1:3100;\n';
  await writeFile(nginx, original);
  await writeFile(tunnel, 'hostname: www.defaultstackr.online\ncredentials-file: /private/unchanged.json\n');
  const env = { ...process.env, PATH: `${root}/bin:${process.env.PATH}` };
  const run = extra => execFileSync('bash', [script], { env: { ...env, ...extra }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  run();
  assert.equal(await readFile(nginx, 'utf8'), original.replace('defaultstack.online', 'defaultstackr.cloud'));
  assert.equal(await readFile(tunnel, 'utf8'), 'hostname: www.defaultstackr.cloud\ncredentials-file: /private/unchanged.json\n');
  assert(run().includes('Updated files: 0'), 'idempotent second run');
  await writeFile(nginx, original);
  assert.throws(() => run({ FAIL_NGINX: '1' }));
  assert.equal(await readFile(nginx, 'utf8'), original, 'failed validation restores original file');
  console.log('PASS: domain rewrite, port/credential-path preservation, idempotence, validation rollback (mock services)');
} finally { await rm(root, { recursive: true, force: true }); }
