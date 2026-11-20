import { NextResponse } from 'next/server';
import { customerAuth } from '@/lib/auth/customer';
import { authBaseURL, customerSessionIssued, githubSignInConfigured } from '@/lib/auth/github-signin.mjs';
import { sessionCookieOptions } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function unavailable(request: Request) {
  return NextResponse.redirect(new URL('/app/login?result=github_unavailable', request.url), { status: 303, headers: { 'Cache-Control': 'no-store' } });
}

// better-auth listens on /api/auth/callback/github. The OAuth app redirect is this
// route; the handler below forwards the code and state without a second token exchange.
export async function GET(request: Request) {
  const auth = customerAuth();
  if (!githubSignInConfigured() || !auth) return unavailable(request);
  const incoming = new URL(request.url);
  const target = new URL(`/api/auth/callback/github${incoming.search}`, authBaseURL());
  let internal: Response;
  try {
    internal = await auth.handler(new Request(target, {
      method: 'GET',
      headers: { cookie: request.headers.get('cookie') ?? '' },
    }));
  } catch {
    return NextResponse.redirect(new URL('/app/login?error=github_failed', request.url), { status: 303, headers: { 'Cache-Control': 'no-store' } });
  }
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  const location = internal.headers.get('location');
  if (location) headers.set('location', location);
  const response = new NextResponse(null, { status: internal.status || 302, headers });
  let customerSession = false;
  for (const cookie of internal.headers.getSetCookie()) {
    response.headers.append('set-cookie', cookie);
    if (customerSessionIssued(cookie)) customerSession = true;
  }
  // A customer session must not keep an admin ds_session. portalIdentity checks that cookie first.
  if (customerSession) response.cookies.set({ ...sessionCookieOptions, value: '', maxAge: 0 });
  return response;
}
