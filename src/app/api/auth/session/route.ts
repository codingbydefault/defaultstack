import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { passwordHashConfigured } from '@/lib/auth/password';
import { SESSION_COOKIE, readSession, sessionSecret } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jar = await cookies();
  const authenticated = await readSession(jar.get(SESSION_COOKIE)?.value);
  return NextResponse.json({
    authenticated,
    configured: passwordHashConfigured() && Boolean(sessionSecret()),
    mock: process.env.DEFAULTSTACKR_MOCK === 'true',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
