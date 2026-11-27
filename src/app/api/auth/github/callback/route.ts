import { NextResponse } from 'next/server';
import { customerAuth } from '@/lib/auth/customer';
import { authBaseURL, githubSignInConfigured } from '@/lib/auth/github-signin.mjs';
import { githubCallbackResponse } from '@/lib/auth/github-response.mjs';
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
  return githubCallbackResponse(internal, sessionCookieOptions);
}
