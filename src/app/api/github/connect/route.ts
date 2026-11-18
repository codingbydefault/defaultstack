import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GITHUB_STATE_COOKIE, githubConfig, githubCookieOptions } from '@/lib/github/connection';
import { SESSION_COOKIE, readSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jar = await cookies();
  if (!(await readSession(jar.get(SESSION_COOKIE)?.value))) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  const config = githubConfig();
  if (!config) return NextResponse.json({ error: 'GitHub is nog niet ingesteld.' }, { status: 503 });
  const state = randomBytes(32).toString('base64url');
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', `${config.origin}/api/github/callback`);
  url.searchParams.set('state', state);
  const response = NextResponse.redirect(url);
  response.cookies.set(GITHUB_STATE_COOKIE, state, { ...githubCookieOptions, maxAge: 600 });
  return response;
}
