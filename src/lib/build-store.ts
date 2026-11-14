import { readFile, readdir, open } from 'node:fs/promises';
import path from 'node:path';
export const BUILD_ID = /^[a-z][a-z0-9-]{0,39}-\d{14}-\d+$/;
export type BuildRecord = { id: string; app: string; status: string; image: string; startedAt: string; updatedAt: string };
export function buildDirectory() {
  return process.env.ENABLE_LOCAL_BUILD_LOGS === 'true' && process.env.DEFAULTSTACK_STATE_DIR ? path.join(process.env.DEFAULTSTACK_STATE_DIR, 'builds') : null;
}
export async function readBuild(directory: string, id: string): Promise<BuildRecord> {
  if (!BUILD_ID.test(id)) throw new Error('Invalid ID');
  const raw = JSON.parse(await readFile(path.join(directory, `${id}.json`), 'utf8'));
  if (raw.id !== id || !/^[a-z][a-z0-9-]{0,39}$/.test(raw.app) || !['building', 'ready', 'failed', 'rolled-back'].includes(raw.status) || !Number.isFinite(Date.parse(raw.startedAt)) || !Number.isFinite(Date.parse(raw.updatedAt)) || typeof raw.image !== 'string') throw new Error('Invalid build record');
  return { id, app: raw.app, status: raw.status, image: raw.image.slice(0, 200), startedAt: raw.startedAt, updatedAt: raw.updatedAt };
}
export async function listBuilds(directory: string) {
  let names: string[];
  try { names = await readdir(directory); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e; }
  const records = await Promise.all(names.filter(name => name.endsWith('.json') && BUILD_ID.test(name.slice(0, -5))).sort((a, b) => (b.match(/-(\d{14})-\d+\.json$/)?.[1] || '').localeCompare(a.match(/-(\d{14})-\d+\.json$/)?.[1] || '')).slice(0, 200).map(name => readBuild(directory, name.slice(0, -5)).catch(() => null)));
  return records.filter((record): record is BuildRecord => record !== null).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 100);
}
export async function readLogTail(directory: string, id: string) {
  const file = await open(path.join(directory, `${id}.log`), 'r');
  try {
    const { size } = await file.stat();
    const buffer = Buffer.alloc(Math.min(size, 65536));
    await file.read(buffer, 0, buffer.length, Math.max(0, size - buffer.length));
    return { text: buffer.toString('utf8').replace(/\x1b\[[0-9;]*[A-Za-z]/g, ''), truncated: size > buffer.length };
  } finally { await file.close(); }
}
