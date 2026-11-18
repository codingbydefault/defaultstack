import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { rejectsCrossSite } from '@/lib/auth/guard';
import { portalIdentity } from '@/lib/auth/portal';
import { CURRENCY_COOKIE, currencyCookieOptions, isBillingCurrency, openCurrency, sealCurrency } from '@/lib/billing/currency';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const jar = await cookies();
  if (!(await portalIdentity())) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  return NextResponse.json({ currency: openCurrency(jar.get(CURRENCY_COOKIE)?.value) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const jar = await cookies();
  if (!(await portalIdentity())) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  if (rejectsCrossSite(request)) return NextResponse.json({ error: 'Ongeldige herkomst.' }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ongeldige invoer.' }, { status: 400 }); }
  const currency = body && typeof body === 'object' && 'currency' in body ? body.currency : undefined;
  if (!isBillingCurrency(currency)) return NextResponse.json({ error: 'Kies EUR, USD of GBP.' }, { status: 400 });
  const response = NextResponse.json({ currency }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(CURRENCY_COOKIE, sealCurrency(currency), currencyCookieOptions);
  return response;
}
