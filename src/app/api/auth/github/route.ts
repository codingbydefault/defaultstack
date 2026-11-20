import { NextResponse } from 'next/server';
import { customerAuth } from '@/lib/auth/customer';
import { authBaseURL, githubSignInConfigured } from '@/lib/auth/github-signin.mjs';
import { safeNextPath } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function unavailable(request: Request) {
  if (request.headers.get('accept')?.includes('application/json')) {
    return NextResponse.json(
      { error: 'GitHub-aanmelding is nog niet ingesteld.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.redirect(new URL('/app/login?result=github_unavailable', request.url), { status: 303, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  if (!githubSignInConfigured()) return unavailable(request);
  const auth = customerAuth();
  if (!auth) return unavailable(request);
  const origin = authBaseURL();
  const next = safeNextPath(new URL(request.url).searchParams.get('next') ?? undefined);
  let internal: Response;
  try {
    internal = await auth.handler(new Request(new URL('/api/auth/sign-in/social', origin), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin,
        cookie: request.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({
        provider: 'github',
        callbackURL: next,
        errorCallbackURL: '/app/login',
        disableRedirect: true,
      }),
    }));
  } catch {
    return unavailable(request);
  }
  const payload = await internal.json().catch(() => null) as { url?: unknown } | null;
  const url = typeof payload?.url === 'string' ? payload.url : '';
  let authorize: URL;
  try { authorize = new URL(url); } catch { return unavailable(request); }
  if (!internal.ok || authorize.origin !== 'https://github.com' || authorize.pathname !== '/login/oauth/authorize' || authorize.searchParams.has('client_secret')) {
    return unavailable(request);
  }
  const response = NextResponse.redirect(authorize, { status: 302, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  for (const cookie of internal.headers.getSetCookie()) response.headers.append('set-cookie', cookie);
  return response;
}
