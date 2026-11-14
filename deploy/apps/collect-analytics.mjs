import { openSync, fstatSync, readSync, closeSync } from 'node:fs';
export function aggregateRequests(text, now = Date.now(), sampled = false) {
  const start = now - 24 * 3600000;
  const apps = Object.create(null);
  const buckets = Array.from({ length: 24 }, (_, index) => ({ time: new Date(start + index * 3600000).toISOString(), requests: 0 }));
  let requests = 0, errors = 0, duration = 0;
  for (const line of text.split('\n')) {
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    const timestamp = Date.parse(row.time);
    const match = /^([a-z][a-z0-9-]{0,39})\.defaultstackr\.cloud$/.exec(row.host || '');
    if (!match || !Number.isFinite(timestamp) || timestamp < start || timestamp > now || row.health === true || !Number.isInteger(row.status) || row.status < 100 || row.status > 599 || !Number.isFinite(row.duration) || row.duration < 0) continue;
    const app = apps[match[1]] ||= { requests: 0, errors: 0, duration: 0 };
    app.requests++; app.errors += row.status >= 500 ? 1 : 0; app.duration += row.duration;
    requests++; errors += row.status >= 500 ? 1 : 0; duration += row.duration;
    const bucket = buckets[Math.min(23, Math.floor((timestamp - start) / 3600000))];
    if (bucket) bucket.requests++;
  }
  return { available: true, sampled, requests, errors, averageMs: requests ? Math.round(duration / requests * 1000) : 0, apps: Object.fromEntries(Object.entries(apps).map(([name, value]) => [name, { requests: value.requests, errors: value.errors, averageMs: Math.round(value.duration / value.requests * 1000) }])), buckets };
}
export function collectAnalytics(file = process.env.DEFAULTSTACK_ACCESS_LOG || '/var/log/nginx/defaultstackr-apps.jsonl') {
  let fd;
  try {
    fd = openSync(file, 'r');
    const size = fstatSync(fd).size;
    const buffer = Buffer.alloc(Math.min(size, 2 * 1024 * 1024));
    readSync(fd, buffer, 0, buffer.length, Math.max(0, size - buffer.length));
    return aggregateRequests(buffer.toString('utf8'), Date.now(), size > buffer.length);
  } catch { return { available: false }; }
  finally { if (fd !== undefined) closeSync(fd); }
}
