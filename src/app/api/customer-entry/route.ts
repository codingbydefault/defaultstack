import { NextResponse } from 'next/server';
import { customerAuth } from '@/lib/auth/customer';
import { sessionCookieOptions } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ORIGINS = new Set([
  'https://www.defaultstackr.cloud',
  'https://defaultstackr.nl', 'https://www.defaultstackr.nl',
  'https://defaultstackr.online', 'https://www.defaultstackr.online',
]);

function redirectToLogin(base: string, status: string) {
  const target = new URL('/app/login', base);
  target.searchParams.set('result', status);
  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: Request) {
  const base = process.env.DEFAULTSTACKR_PUBLIC_URL;
  const auth = customerAuth();
  if (!base || !auth) return Response.json({ error: 'Klantaanmelding is nog niet beschikbaar.' }, { status: 503 });
  const origin = request.headers.get('origin');
  if (!origin || (!ALLOWED_ORIGINS.has(origin) && origin !== new URL(base).origin)) {
    return Response.json({ error: 'Ongeldige herkomst.' }, { status: 403 });
  }
  let form: FormData;
  try { form = await request.formData(); } catch { return redirectToLogin(base, 'invalid'); }
  const mode = form.get('mode');
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if ((mode !== 'login' && mode !== 'register') || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || password.length < 10 || password.length > 200) return redirectToLogin(base, 'invalid');
  try {
    const result = mode === 'register'
      ? await auth.api.signUpEmail({ body: { name: email.split('@')[0].slice(0, 40), email, password }, headers: request.headers, asResponse: true })
      : await auth.api.signInEmail({ body: { email, password }, headers: request.headers, asResponse: true });
    if (!result.ok) return redirectToLogin(base, 'failed');
    const response = NextResponse.redirect(new URL('/app', base), { status: 303 });
    response.headers.set('Cache-Control', 'no-store');
    for (const cookie of result.headers.getSetCookie()) response.headers.append('set-cookie', cookie);
    response.cookies.set({ ...sessionCookieOptions, value: '', maxAge: 0 });
    return response;
  } catch {
    return redirectToLogin(base, 'failed');
  }
}
