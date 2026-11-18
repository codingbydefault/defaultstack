import { cookies } from 'next/headers';
import { readSession, SESSION_COOKIE } from '@/lib/auth/session';
import { rejectsCrossSite } from '@/lib/auth/guard';
import { siteDb } from '@/lib/site-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function admin(): Promise<boolean> {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function GET() {
  if (!(await admin())) return Response.json({ error: 'Geen toegang.' }, { status: 403 });
  const db = siteDb();
  if (!db) return Response.json({ error: 'Reviewdatabase is niet geconfigureerd.' }, { status: 503 });
  try {
    const result = await db.query("SELECT id, display_name, email, rating, body, created_at FROM site_reviews WHERE status = 'pending' ORDER BY created_at LIMIT 100");
    return Response.json({ reviews: result.rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Reviews laden mislukt.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!(await admin())) return Response.json({ error: 'Geen toegang.' }, { status: 403 });
  if (!request.headers.get('origin') || rejectsCrossSite(request)) return Response.json({ error: 'Ongeldige herkomst.' }, { status: 403 });
  const db = siteDb();
  if (!db) return Response.json({ error: 'Reviewdatabase is niet geconfigureerd.' }, { status: 503 });
  const body = await request.json().catch(() => null) as { id?: unknown; action?: unknown } | null;
  const id = Number(body?.id);
  const action = body?.action;
  if (!Number.isSafeInteger(id) || id < 1 || (action !== 'approve' && action !== 'reject')) return Response.json({ error: 'Ongeldige keuze.' }, { status: 400 });
  try {
    const result = await db.query("UPDATE site_reviews SET status = $2, reviewed_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING id", [id, action === 'approve' ? 'approved' : 'rejected']);
    return Response.json({ ok: result.rowCount === 1 }, { status: result.rowCount === 1 ? 200 : 404 });
  } catch { return Response.json({ error: 'Review beoordelen mislukt.' }, { status: 503 }); }
}
