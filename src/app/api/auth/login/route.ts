import { NextResponse } from 'next/server';
import { clientAddress, rejectsCrossSite } from '@/lib/auth/guard';
import { passwordHashConfigured, verifyAdminPassword } from '@/lib/auth/password';
import { createSessionToken, sessionCookieOptions, sessionSecret } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const attempts = new Map<string, { count: number; resetAt: number }>();

function limited(address: string): boolean {
  const now = Date.now();
  const current = attempts.get(address);
  if (!current || current.resetAt < now) {
    attempts.set(address, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 8;
}

export async function POST(request: Request) {
  if (rejectsCrossSite(request)) return NextResponse.json({ error: 'Ongeldige herkomst.' }, { status: 403 });
  if (limited(clientAddress(request))) {
    return NextResponse.json({ error: 'Te veel pogingen. Wacht een minuut.' }, { status: 429 });
  }
  if (!passwordHashConfigured() || !sessionSecret()) {
    return NextResponse.json({ error: 'Beheerlogin is niet geconfigureerd op de server.' }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!(await verifyAdminPassword(password))) {
    return NextResponse.json({ error: 'Onjuist wachtwoord.' }, { status: 401 });
  }
  const secret = sessionSecret();
  if (!secret) return NextResponse.json({ error: 'Beheerlogin is niet geconfigureerd op de server.' }, { status: 503 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...sessionCookieOptions, value: await createSessionToken(secret) });
  return response;
}
