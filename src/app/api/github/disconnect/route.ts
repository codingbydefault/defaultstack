import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { rejectsCrossSite } from '@/lib/auth/guard';
import { SESSION_COOKIE, readSession } from '@/lib/auth/session';
import { GITHUB_COOKIE, githubCookieOptions } from '@/lib/github/connection';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const jar = await cookies();
  if (!(await readSession(jar.get(SESSION_COOKIE)?.value))) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  if (rejectsCrossSite(request)) return NextResponse.json({ error: 'Ongeldige herkomst.' }, { status: 403 });
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(GITHUB_COOKIE, '', { ...githubCookieOptions, maxAge: 0 });
  return response;
}
