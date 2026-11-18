import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GITHUB_COOKIE, GITHUB_STATE_COOKIE, githubConfig, githubCookieOptions, githubJson, sealConnection } from '@/lib/github/connection';
import { portalIdentity } from '@/lib/auth/portal';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const jar = await cookies();
  const config = githubConfig();
  const identity = await portalIdentity();
  if (!config || !identity) return NextResponse.redirect(new URL('/app/login', request.url));
  const query = new URL(request.url).searchParams;
  const state = query.get('state');
  const expected = jar.get(GITHUB_STATE_COOKIE)?.value;
  const code = query.get('code');
  if (!state || !expected || state !== expected || !code) return NextResponse.redirect(`${config.origin}/app/projects/new?github=failed`);
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret,
        code, redirect_uri: `${config.origin}/api/github/callback` }),
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    const token = await response.json() as Record<string, unknown>;
    if (!response.ok || typeof token.access_token !== 'string') throw new Error('GitHub OAuth failed');
    const user = await githubJson('/user', token.access_token) as Record<string, unknown>;
    if (!Number.isSafeInteger(user.id) || typeof user.login !== 'string') throw new Error('GitHub identity failed');
    const sealed = sealConnection({
      accessToken: token.access_token,
      refreshToken: typeof token.refresh_token === 'string' ? token.refresh_token : undefined,
      expiresAt: typeof token.expires_in === 'number' ? Date.now() + token.expires_in * 1000 : undefined,
      githubId: user.id as number,
      login: user.login,
      portalId: identity.kind === 'admin' ? 'admin' : identity.id,
    });
    const result = NextResponse.redirect(`${config.origin}/app/projects/new?github=connected`);
    result.cookies.set(GITHUB_COOKIE, sealed, githubCookieOptions);
    result.cookies.set(GITHUB_STATE_COOKIE, '', { ...githubCookieOptions, maxAge: 0 });
    return result;
  } catch {
    const result = NextResponse.redirect(`${config.origin}/app/projects/new?github=failed`);
    result.cookies.set(GITHUB_STATE_COOKIE, '', { ...githubCookieOptions, maxAge: 0 });
    return result;
  }
}
