import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, readSession } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get('host') ?? '').toLowerCase().split(':')[0];
  // Loopback is reserved for local health checks and the server's own tests.
  const consoleHost = host === 'defaultstackr.cloud' || host === '127.0.0.1' || host === 'localhost';
  if (!consoleHost) return new NextResponse(null, { status: 404 });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (pathname === '/app/login' || pathname === '/api/auth/login') return NextResponse.next();
  const signedIn = await readSession(token);

  if (pathname.startsWith('/api/')) {
    if (!signedIn) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.next();
  }

  if (!signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/app/login';
    url.search = '';
    if (pathname !== '/app') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app', '/app/:path*', '/api/auth/:path*', '/api/stack/:path*', '/api/platform', '/api/data/:path*'],
};
