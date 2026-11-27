import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { open } from 'node:fs/promises';
import { portalIdentity } from '@/lib/auth/portal';
import { SETUP_COOKIE, validSetupState, privateAppConfig } from '@/lib/github/setup.mjs';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const identity = await portalIdentity();
  if (identity?.kind !== 'customer' || !identity.owner) return Response.json({error:'Geen toegang.'},{status:403});
  const query=new URL(request.url).searchParams;
  const jar=await cookies();
  const code=query.get('code');
  if (!validSetupState(query.get('state'),jar.get(SETUP_COOKIE)?.value) || !code || !/^[A-Za-z0-9_-]{1,200}$/.test(code)) return Response.json({error:'De app-inrichting is verlopen. Start opnieuw vanuit je profiel.'},{status:400});
  const path=process.env.DEFAULTSTACKR_GITHUB_CONFIG_FILE;
  if (!path) return Response.json({error:'Configuratie-opslag ontbreekt.'},{status:503});
  try {
    const result=await fetch(`https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`,{method:'POST',headers:{Accept:'application/vnd.github+json','User-Agent':'DefaultStackR','X-GitHub-Api-Version':'2022-11-28'},cache:'no-store',signal:AbortSignal.timeout(15000)});
    const config=result.ok ? privateAppConfig(await result.json()) : null;
    if (!config) throw new Error('Invalid app registration');
    // Exclusive creation preserves an existing integration; credentials stay on the HDD.
    const file=await open(path,'wx',0o600);
    try { await file.writeFile(JSON.stringify(config)); } finally {await file.close();}
    const response=NextResponse.redirect('https://defaultstackr.cloud/app/projects/new?github=setup_complete',303);
    response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');
    response.cookies.set(SETUP_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
    return response;
  } catch { return Response.json({error:'De app-inrichting kon niet worden afgerond. Probeer opnieuw of neem contact op met de beheerder.'},{status:502}); }
}
