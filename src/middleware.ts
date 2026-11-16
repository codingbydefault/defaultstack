import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LOGIN_TARGET_HEADER, SESSION_COOKIE, loginRedirectPath, readSession } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = await readSession(token);

  if (pathname.startsWith('/api/stack')) {
    if (!signedIn) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.next();
  }

  // Next.js parses a middleware Location with the internal host, so a redirect
  // here becomes https://localhost:3100/... behind Nginx. Pass a relative
  // target and let the app layout emit the Location header. `next` is only
  // included when the path is not exactly /app.
  const headers = new Headers(request.headers);
  headers.delete(LOGIN_TARGET_HEADER);
  if (pathname !== '/app/login' && !signedIn) headers.set(LOGIN_TARGET_HEADER, loginRedirectPath(pathname));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/app', '/app/:path*', '/api/stack/:path*'],
};
