import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, readSession } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = await readSession(token);

  if (pathname.startsWith('/api/stack')) {
    if (!signedIn) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.next();
  }

  if (pathname === '/app/login') return NextResponse.next();
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
  matcher: ['/app', '/app/:path*', '/api/stack/:path*'],
};
