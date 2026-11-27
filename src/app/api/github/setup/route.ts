import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { portalIdentity } from '@/lib/auth/portal';
import { rejectsCrossSite } from '@/lib/auth/guard';
import { githubConfig } from '@/lib/github/connection';
import { SETUP_COOKIE, repositoryAppManifest } from '@/lib/github/setup.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const identity = await portalIdentity();
  if (identity?.kind !== 'customer' || !identity.owner) return Response.json({error:'Geen toegang.'},{status:403});
  if (!request.headers.get('origin') || rejectsCrossSite(request)) return Response.json({error:'Ongeldige herkomst.'},{status:403});
  if (!process.env.DEFAULTSTACKR_GITHUB_CONFIG_FILE) return Response.json({error:'De beveiligde configuratie-opslag is nog niet ingesteld.'},{status:503});
  if (githubConfig()) return Response.json({error:'De GitHub App is al ingesteld.'},{status:409});
  const state = randomBytes(32).toString('hex');
  const response = NextResponse.json({manifest:repositoryAppManifest(),action:`https://github.com/settings/apps/new?state=${state}`},{headers:{'Cache-Control':'no-store'}});
  response.cookies.set(SETUP_COOKIE,state,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:600});
  return response;
}
