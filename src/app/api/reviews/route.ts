import { NextResponse } from 'next/server';
import { siteDb } from '@/lib/site-db';
import { readLimitedBody } from '@/lib/read-limited-body';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ORIGINS = new Set(['https://defaultstackr.nl', 'https://www.defaultstackr.nl', 'https://defaultstackr.online', 'https://www.defaultstackr.online', 'https://www.defaultstackr.cloud']);

export async function GET() {
  const db = siteDb();
  if (!db) return Response.json({ error: 'Reviews zijn nog niet beschikbaar.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  try {
    const result = await db.query("SELECT display_name, rating, body, created_at FROM site_reviews WHERE status = 'approved' ORDER BY reviewed_at DESC NULLS LAST, created_at DESC LIMIT 6");
    return Response.json({ reviews: result.rows.map(row => ({ name: row.display_name, rating: row.rating, body: row.body, createdAt: row.created_at })) }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch { return Response.json({ error: 'Reviews zijn tijdelijk niet beschikbaar.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || !ORIGINS.has(origin)) return Response.json({ error: 'Ongeldige herkomst.' }, { status: 403 });
  const db = siteDb();
  if (!db) return Response.json({ error: 'Reviews zijn nog niet beschikbaar.' }, { status: 503 });
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return Response.json({ error: 'Ongeldig formulier.' }, { status: 415 });
  const raw = await readLimitedBody(request, 8192);
  if (raw === null) return Response.json({ error: 'Invoer is te lang.' }, { status: 413 });
  const form = new URLSearchParams(raw);
  if (form.get('website')) return NextResponse.redirect(new URL('/?review=received#reviews', origin), { status: 303 });
  const name = (form.get('name') || '').trim();
  const email = (form.get('email') || '').trim().toLowerCase();
  const body = (form.get('body') || '').trim();
  const rating = Number(form.get('rating'));
  if (name.length < 2 || name.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
    || body.length < 20 || body.length > 1200 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: 'Controleer je review en probeer opnieuw.' }, { status: 400 });
  }
  try {
    const recent = await db.query('SELECT COUNT(*)::int AS total FROM site_reviews WHERE email = $1 AND created_at > NOW() - INTERVAL \'24 hours\'', [email]);
    if (recent.rows[0].total >= 2) return Response.json({ error: 'Je hebt vandaag al twee reviews ingestuurd.' }, { status: 429 });
    await db.query('INSERT INTO site_reviews (display_name, email, rating, body) VALUES ($1, $2, $3, $4)', [name, email, rating, body]);
    const response = NextResponse.redirect(new URL('/?review=received#reviews', origin), { status: 303 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch { return Response.json({ error: 'Review opslaan mislukt.' }, { status: 503 }); }
}
