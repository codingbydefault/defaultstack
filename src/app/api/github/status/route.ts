import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { portalIdentity } from '@/lib/auth/portal';
import { GITHUB_COOKIE, githubConfig, openConnection } from '@/lib/github/connection';

import { repositoryConnection } from '@/lib/github/repository-connection.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jar = await cookies();
  const identity = await portalIdentity();
  if (!identity) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  const config = githubConfig();
  const connection = config ? repositoryConnection(openConnection(jar.get(GITHUB_COOKIE)?.value), identity, config.clientId) : null;
  return NextResponse.json({
    privateDeployReady: identity.kind === 'customer' && identity.owner === true && config?.privateDeployReady === true,
    configured: Boolean(config), connected: Boolean(connection), login: connection?.login ?? null, automatic: false, customer: identity.kind === 'customer',
    installUrl: config ? `https://github.com/apps/${config.appSlug}/installations/new` : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
