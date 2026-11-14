import { mkdtemp, mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const root = await mkdtemp(path.join(os.tmpdir(), 'router-test-'));
try {
  for (const folder of ['bin', 'locks', 'etc/nginx/conf.d', 'etc/logrotate.d']) await mkdir(path.join(root, folder), { recursive: true });
  const original = await readFile('deploy/router/manage.sh', 'utf8');
  await writeFile(path.join(root, 'manage.sh'), original.replaceAll('/etc/', `${root}/etc/`).replaceAll('/run/lock', `${root}/locks`).replaceAll('/var/log/nginx', `${root}/var/log/nginx`));
  await writeFile(path.join(root, 'apps.conf'), await readFile('deploy/router/apps.conf'));
  await writeFile(path.join(root, 'logrotate.conf'), await readFile('deploy/router/logrotate.conf'));
  for (const [name, command] of Object.entries({ id: 'echo 0', nginx: 'test "${FAIL_NGINX:-0}" != 1', curl: 'exit 0', chown: 'exit 0' })) {
    const file = path.join(root, 'bin', name); await writeFile(file, `#!/bin/sh\n${command}\n`); await chmod(file, 0o700);
  }
  const run = (args, extra = {}) => execFileSync('bash', [path.join(root, 'manage.sh'), ...args], { env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
  run(['install']); run(['register', 'hello', '3200']); run(['register', 'hello', '3200']);
  const map = path.join(root, 'etc/nginx/defaultstackr-apps/routes.map');
  const valid = await readFile(map, 'utf8');
  assert.equal(valid.split('\n').filter(line => line.startsWith('hello.')).length, 1);
  assert.throws(() => run(['register', 'other', '3200']));
  assert.throws(() => run(['register', 'api', '3201']));
  assert.throws(() => run(['register', '../bad', '3201']));
  assert.throws(() => run(['register', 'other', '3201'], { FAIL_NGINX: '1' }));
  assert.equal(await readFile(map, 'utf8'), valid);
  console.log('PASS: router install, idempotent registration, reserved names, port collision and validation rollback (mock services)');
} finally { await rm(root, { recursive: true, force: true }); }
