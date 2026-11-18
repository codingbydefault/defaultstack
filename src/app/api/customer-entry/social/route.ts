import { NextResponse } from 'next/server';
import { sessionCookieOptions } from '@/lib/auth/session';
import { customerAuthConfigured } from '@/lib/auth/customer';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = new Set([
  'https://www.defaultstackr.cloud',
  'https://defaultstackr.nl', 'https://www.defaultstackr.nl',
  'https://defaultstackr.online', 'https://www.defaultstackr.online',
]);

export async function POST(request: Request) {
  const base = process.env.DEFAULTSTACKR_PUBLIC_URL || SITE_URL;
  const origin = request.headers.get('origin');
  if (!origin || (!ALLOWED_ORIGINS.has(origin) && origin !== new URL(base).origin)) {
    return Response.json({ error: 'Ongeldige herkomst.' }, { status: 403 });
  }
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: 'Ongeldig formulier.' }, { status: 400 }); }
  const provider = form.get('provider');
  if (provider !== 'github' && provider !== 'google') return Response.json({ error: 'Ongeldige aanbieder.' }, { status: 400 });
  const target = new URL('/app/login', base);
  const credentialsAvailable = provider === 'github'
    ? Boolean(process.env.DEFAULTSTACKR_GITHUB_CLIENT_ID && process.env.DEFAULTSTACKR_GITHUB_CLIENT_SECRET)
    : Boolean(process.env.DEFAULTSTACKR_GOOGLE_CLIENT_ID && process.env.DEFAULTSTACKR_GOOGLE_CLIENT_SECRET);
  if (customerAuthConfigured() && credentialsAvailable) target.searchParams.set('provider', provider);
  else target.searchParams.set('result', 'unavailable');
  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.set('Cache-Control', 'no-store');
  response.cookies.set({ ...sessionCookieOptions, value: '', maxAge: 0 });
  return response;
}
