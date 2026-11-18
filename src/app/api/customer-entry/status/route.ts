import { customerAuthConfigured } from '@/lib/auth/customer';
import { siteDb } from '@/lib/site-db';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = new Set([
  'https://www.defaultstackr.cloud',
  'https://defaultstackr.nl', 'https://www.defaultstackr.nl',
  'https://defaultstackr.online', 'https://www.defaultstackr.online',
]);

export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
  if (origin && ALLOWED_ORIGINS.has(origin)) headers.set('Access-Control-Allow-Origin', origin);
  let available = customerAuthConfigured();
  if (available) {
    try { await siteDb()?.query('SELECT 1 FROM "user" LIMIT 0'); }
    catch { available = false; }
  }
  return Response.json({
    available,
    github: available && Boolean(process.env.DEFAULTSTACKR_GITHUB_CLIENT_ID && process.env.DEFAULTSTACKR_GITHUB_CLIENT_SECRET),
    google: available && Boolean(process.env.DEFAULTSTACKR_GOOGLE_CLIENT_ID && process.env.DEFAULTSTACKR_GOOGLE_CLIENT_SECRET),
  }, { headers });
}
