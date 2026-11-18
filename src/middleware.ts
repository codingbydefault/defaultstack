import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LOGIN_TARGET_HEADER, SESSION_COOKIE, loginRedirectPath, readSession } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicHost = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0]?.trim().toLowerCase();
  if (publicHost && ['defaultstackr.nl', 'www.defaultstackr.nl', 'defaultstackr.online', 'www.defaultstackr.online'].includes(publicHost)) {
    const cloud = new URL(`${pathname}${request.nextUrl.search}`, 'https://www.defaultstackr.cloud');
    return NextResponse.redirect(cloud, 307);
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = await readSession(token);
  // This is only a fast redirect hint. The layout and API validate the
  // session against Better Auth before serving private data.
  const customerCookie = request.cookies.get('__Secure-better-auth.session_token')?.value
    ?? request.cookies.get('better-auth.session_token')?.value;

  if (pathname.startsWith('/api/stack')) {
    if (!signedIn && !customerCookie) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.next();
  }

  // Next.js parses a middleware Location with the internal host, so a redirect
  // here becomes https://localhost:3100/... behind Nginx. Pass a relative
  // target and let the app layout emit the Location header. `next` is only
  // included when the path is not exactly /app.
  const headers = new Headers(request.headers);
  headers.delete(LOGIN_TARGET_HEADER);
  if (pathname !== '/app/login' && !signedIn && !customerCookie) headers.set(LOGIN_TARGET_HEADER, loginRedirectPath(pathname));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/app', '/app/:path*', '/api/stack/:path*'],
};
