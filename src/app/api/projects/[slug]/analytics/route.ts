import { portalIdentity } from '@/lib/auth/portal';
import { isSafeSegment } from '@/lib/api/contract';
import { siteDb } from '@/lib/site-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const identity = await portalIdentity();
  if (!identity) return Response.json({ error: 'Niet ingelogd.' }, { status: 401 });
  const { slug } = await context.params;
  if (!isSafeSegment(slug)) return Response.json({ error: 'Ongeldig project.' }, { status: 400 });
  const db = siteDb();
  const base = process.env.DEFAULTSTACKR_API_URL;
  const apiKey = process.env.DEFAULTSTACKR_API_KEY;
  if (!db || !base || !apiKey) return Response.json({ error: 'Analytics is nog niet geconfigureerd.' }, { status: 503 });
  try {
    const target = new URL(`api/projects/${encodeURIComponent(slug)}`, base.endsWith('/') ? base : `${base}/`);
    const projectResponse = await fetch(target, {
      headers: { Authorization: `Bearer ${apiKey}`, ...(identity.kind === 'customer' ? { 'X-Defaultstackr-User-Id': identity.id } : {}) },
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!projectResponse.ok) return Response.json({ error: 'Project niet gevonden.' }, { status: projectResponse.status === 404 ? 404 : 502 });
    const project = await projectResponse.json() as { id?: unknown };
    const id = Number(project.id);
    if (!Number.isSafeInteger(id)) return Response.json({ error: 'Projectgegevens zijn ongeldig.' }, { status: 502 });
    const [days, pages, total] = await Promise.all([
      db.query(`SELECT day, SUM(views)::int AS views FROM project_pageviews WHERE project_id = $1 AND day >= CURRENT_DATE - INTERVAL '13 days' GROUP BY day ORDER BY day`, [id]),
      db.query(`SELECT path, SUM(views)::int AS views FROM project_pageviews WHERE project_id = $1 AND day >= CURRENT_DATE - INTERVAL '13 days' GROUP BY path ORDER BY views DESC LIMIT 10`, [id]),
      db.query(`SELECT COALESCE(SUM(views), 0)::int AS views FROM project_pageviews WHERE project_id = $1 AND day >= CURRENT_DATE - INTERVAL '13 days'`, [id]),
    ]);
    return Response.json({ total: total.rows[0]?.views ?? 0, days: days.rows.map(row => ({ day: row.day, views: row.views })), pages: pages.rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Analytics laden mislukt.' }, { status: 503 }); }
}
