import { collectAnalytics } from './collect-analytics.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, renameSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
// Run as the deploy user, never from the Next.js web process.
const directory = process.env.DEFAULTSTACK_STATE_DIR || path.join(os.homedir(), '.local/state/defaultstack');
const names = execFileSync('docker', ['ps', '-a', '--format', '{{.Names}}'], { encoding: 'utf8', timeout: 10000 }).trim().split('\n').filter(name => /^defaultstack-app-[a-z][a-z0-9-]{0,39}$/.test(name) && !name.endsWith('-previous') && !name.includes('-check-'));
let metrics = [];
if (names.length) {
  try { metrics = execFileSync('docker', ['stats', '--no-stream', '--format', '{{json .}}', ...names], { encoding: 'utf8', timeout: 15000 }).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); } catch { /* Snapshot still works without resource metrics. */ }
}
const deployments = names.map(name => {
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8', timeout: 10000 }));
  const binding = container.HostConfig.PortBindings?.['8080/tcp']?.[0];
  const app = name.replace('defaultstack-app-', '');
  let publication;
  try { const stored = JSON.parse(readFileSync(path.join(directory, `${app}-publication.json`), 'utf8')); if (stored.image === container.Config.Image) publication = { url: stored.url, status: stored.status, checkedAt: stored.checkedAt }; } catch { /* Not checked yet. */ }
  const metric = metrics.find(item => item.Name === name);
  const resources = metric ? { cpu: metric.CPUPerc, memory: metric.MemUsage } : undefined;
  return { publication, resources, name: name.replace('defaultstack-app-', ''), image: container.Config.Image, state: container.State.Status, health: container.State.Health?.Status || 'unknown', port: binding ? Number(binding.HostPort) : null, created: container.Created };
});
mkdirSync(directory, { recursive: true, mode: 0o700 });
const temporary = path.join(directory, `status-${process.pid}.tmp`);
writeFileSync(temporary, JSON.stringify({ generatedAt: new Date().toISOString(), deployments, analytics: collectAnalytics() }, null, 2), { mode: 0o600 });
renameSync(temporary, path.join(directory, 'status.json'));
console.log(`Exported ${deployments.length} deployments. Dashboard snapshot updated.`);
