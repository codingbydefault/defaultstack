import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { portalIdentity } from '@/lib/auth/portal';
import { GITHUB_COOKIE, githubConfig, githubCustomerToken, githubJson, openConnection } from '@/lib/github/connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jar = await cookies();
  const identity = await portalIdentity();
  if (!identity) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  const config = githubConfig();
  const opened = openConnection(jar.get(GITHUB_COOKIE)?.value);
  const connection = opened && (opened.portalId ?? 'admin') === (identity.kind === 'admin' ? 'admin' : identity.id) ? opened : null;
  let login = connection?.login ?? null;
  let connected = Boolean(config && connection);
  let automatic = false;
  if (config && identity.kind === 'customer' && !connection) {
    try {
      const token = await githubCustomerToken(await headers());
      if (token) {
        const user = await githubJson('/user', token) as { login?: string };
        login = typeof user.login === 'string' ? user.login : null;
        connected = Boolean(login);
        automatic = connected;
      }
    } catch { connected = false; }
  }
  return NextResponse.json({
    configured: Boolean(config), connected, login, automatic, customer: identity.kind === 'customer',
    installUrl: config ? `https://github.com/apps/${config.appSlug}/installations/new` : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
