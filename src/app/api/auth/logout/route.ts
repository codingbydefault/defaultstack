import { NextResponse } from 'next/server';
import { rejectsCrossSite } from '@/lib/auth/guard';
import { sessionCookieOptions } from '@/lib/auth/session';
import { CURRENCY_COOKIE, currencyCookieOptions } from '@/lib/billing/currency';
import { GITHUB_COOKIE, githubCookieOptions } from '@/lib/github/connection';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (rejectsCrossSite(request)) return NextResponse.json({ error: 'Ongeldige herkomst.' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...sessionCookieOptions, value: '', maxAge: 0 });
  response.cookies.set(GITHUB_COOKIE, '', { ...githubCookieOptions, maxAge: 0 });
  response.cookies.set(CURRENCY_COOKIE, '', { ...currencyCookieOptions, maxAge: 0 });
  return response;
}
