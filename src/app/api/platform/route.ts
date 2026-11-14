import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Deployment, PlatformStatus, Publication, Analytics } from '@/lib/platform-status';
export const dynamic = 'force-dynamic';
export async function GET() {
  const directory = process.env.DEFAULTSTACK_STATE_DIR;
  const response = (data: PlatformStatus) => Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  if (!directory) return response({ connected: false, generatedAt: null, stale: false, deployments: [], message: 'Connect a server snapshot to show real deployments.' });
  try {
    const file = await readFile(path.join(directory, 'status.json'), 'utf8');
    if (file.length > 1024 * 1024) throw new Error('Snapshot too large');
    const raw = JSON.parse(file);
    const timestamp = Date.parse(raw.generatedAt);
    if (!Number.isFinite(timestamp) || !Array.isArray(raw.deployments)) throw new Error('Invalid snapshot');
    const deployments: Deployment[] = raw.deployments.slice(0, 100).map((item: Deployment) => {
      if (!/^[a-z][a-z0-9-]{0,39}$/.test(item.name) || typeof item.image !== 'string' || typeof item.state !== 'string' || typeof item.health !== 'string' || typeof item.created !== 'string') throw new Error('Invalid deployment');
      let publication: Publication | undefined;
      if (item.publication && item.publication.url === `https://${item.name}.defaultstackr.cloud` && ['ready', 'pending-dns', 'pending-https', 'pending-route', 'unhealthy', 'unverified'].includes(item.publication.status) && Number.isFinite(Date.parse(item.publication.checkedAt))) {
        publication = { url: item.publication.url, checkedAt: item.publication.checkedAt, status: Date.now() - Date.parse(item.publication.checkedAt) > 120000 ? 'unverified' : item.publication.status };
      }
      const resources = item.resources && typeof item.resources.cpu === 'string' && typeof item.resources.memory === 'string' ? { cpu: item.resources.cpu.slice(0, 40), memory: item.resources.memory.slice(0, 80) } : undefined;
      return { publication, resources, name: item.name, image: item.image.slice(0, 200), state: item.state, health: item.health, port: Number.isInteger(item.port) && Number(item.port) > 0 && Number(item.port) < 65536 ? item.port : null, created: item.created };
    });
    let analytics: Analytics = { available: false };
    const a = raw.analytics;
    if (a?.available === true && [a.requests, a.errors, a.averageMs].every(value => Number.isFinite(value) && value >= 0)) {
      analytics = { available: true, sampled: a.sampled === true, requests: a.requests, errors: a.errors, averageMs: a.averageMs, buckets: Array.isArray(a.buckets) ? a.buckets.slice(0, 24).filter((b: { time: string; requests: number }) => Number.isFinite(Date.parse(b.time)) && Number.isFinite(b.requests) && b.requests >= 0).map((b: { time: string; requests: number }) => ({ time: b.time, requests: b.requests })) : [] };
    }
    return response({ analytics, connected: true, generatedAt: new Date(timestamp).toISOString(), stale: Date.now() - timestamp > 120000, deployments });
  } catch {
    return response({ connected: false, generatedAt: null, stale: false, deployments: [], message: 'No readable server snapshot yet. Run the status export on Ubuntu.' });
  }
}
