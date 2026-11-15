import { NextResponse } from 'next/server';
import { rejectsCrossSite } from '@/lib/auth/guard';
import { sessionCookieOptions } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (rejectsCrossSite(request)) return NextResponse.json({ error: 'Ongeldige herkomst.' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...sessionCookieOptions, value: '', maxAge: 0 });
  return response;
}
