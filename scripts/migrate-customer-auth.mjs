import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');
if (!existsSync(envFile)) {
  console.error('Maak eerst .env.local met de klantauthenticatie-instellingen.');
  process.exit(1);
}
process.loadEnvFile(envFile);
if (!process.env.DEFAULTSTACKR_AUTH_DATABASE_URL || (process.env.DEFAULTSTACKR_AUTH_SECRET?.length ?? 0) < 32) {
  console.error('DEFAULTSTACKR_AUTH_DATABASE_URL of DEFAULTSTACKR_AUTH_SECRET ontbreekt of is te kort.');
  process.exit(1);
}
const result = spawnSync('npx', ['--yes', 'auth@1.7.25', 'migrate', '--config', './src/auth.ts'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
