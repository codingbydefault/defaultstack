import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, readSession } from '@/lib/auth/session';
import { GITHUB_COOKIE, githubConfig, openConnection } from '@/lib/github/connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jar = await cookies();
  if (!(await readSession(jar.get(SESSION_COOKIE)?.value))) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  const config = githubConfig();
  const connection = openConnection(jar.get(GITHUB_COOKIE)?.value);
  return NextResponse.json({
    configured: Boolean(config), connected: Boolean(config && connection),
    login: config && connection ? connection.login : null,
    installUrl: config ? `https://github.com/apps/${config.appSlug}/installations/new` : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
