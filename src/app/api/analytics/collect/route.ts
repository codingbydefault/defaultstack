import { siteDb } from '@/lib/site-db';
import { readLimitedBody } from '@/lib/read-limited-body';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const recent = new Map<string, { count: number; reset: number }>();

function cors(origin: string): HeadersInit {
  return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Cache-Control': 'no-store' };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: { ...cors(origin), 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type' } });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return new Response(null, { status: 403 });
  let host: string;
  try { const url = new URL(origin); if (url.protocol !== 'https:') throw new Error('https'); host = url.hostname.toLowerCase(); }
  catch { return new Response(null, { status: 403 }); }
  if (!request.headers.get('content-type')?.startsWith('text/plain')) return new Response(null, { status: 415, headers: cors(origin) });
  const raw = await readLimitedBody(request, 512);
  if (raw === null) return new Response(null, { status: 413, headers: cors(origin) });
  let body: { project?: unknown; path?: unknown };
  try { body = JSON.parse(raw); } catch { return new Response(null, { status: 400, headers: cors(origin) }); }
  if (typeof body.project !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(body.project)
    || typeof body.path !== 'string' || !/^\/[A-Za-z0-9/_.,~!$&'()+;=:@%-]{0,199}$/.test(body.path)
    || body.path.includes('..')) return new Response(null, { status: 400, headers: cors(origin) });
  const db = siteDb();
  if (!db) return new Response(null, { status: 503, headers: cors(origin) });
  try {
    const found = await db.query(
      `SELECT p.id FROM projects p JOIN domains d ON d.project_id = p.id
       WHERE p.slug = $1 AND d.hostname = $2 AND (d.kind = 'preview' OR d.status IN ('verified', 'ssl_active', 'live')) LIMIT 1`,
      [body.project, host]
    );
    if (!found.rows[0]) return new Response(null, { status: 403, headers: cors(origin) });
    const address = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
    const key = `${found.rows[0].id}:${address}`;
    const now = Date.now();
    const hit = recent.get(key);
    if (hit && hit.reset > now && hit.count >= 120) return new Response(null, { status: 429, headers: cors(origin) });
    recent.set(key, hit && hit.reset > now ? { ...hit, count: hit.count + 1 } : { count: 1, reset: now + 60000 });
    if (recent.size > 10000) for (const [item, value] of recent) if (value.reset <= now) recent.delete(item);
    await db.query(
      `INSERT INTO project_pageviews (project_id, day, hostname, path, views)
       VALUES ($1, CURRENT_DATE, $2, $3, 1)
       ON CONFLICT (project_id, day, hostname, path) DO UPDATE SET views = project_pageviews.views + 1`,
      [found.rows[0].id, host, body.path]
    );
    return new Response(null, { status: 204, headers: cors(origin) });
  } catch { return new Response(null, { status: 503, headers: cors(origin) }); }
}
