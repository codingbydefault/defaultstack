import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { rejectsCrossSite } from '@/lib/auth/guard';
import { SESSION_COOKIE, readSession } from '@/lib/auth/session';

async function forward(request: NextRequest, context: { params: Promise<{ table: string; id?: string[] }> }) {
  // Opt-in operator tool. Disabled unless explicitly enabled, and then only for a valid admin session.
  if (process.env.ENABLE_LOCAL_DATABASE_EDITOR !== 'true') {
    return NextResponse.json({ error: 'Database editor disabled. Enable it only on your private home network.' }, { status: 503 });
  }
  const jar = await cookies();
  if (!(await readSession(jar.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD' && rejectsCrossSite(request)) {
    return NextResponse.json({ error: 'Ongeldige herkomst.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const { table, id = [] } = await context.params;
  if (!['users', 'products'].includes(table) || id.length > 1 || (id[0] && !/^\d+$/.test(id[0]))) {
    return NextResponse.json({ error: 'Invalid table or record ID' }, { status: 400 });
  }
  if ((request.method === 'POST' && id.length) || (['PATCH', 'DELETE'].includes(request.method) && !id.length)) {
    return NextResponse.json({ error: 'Invalid record path' }, { status: 400 });
  }
  const base = process.env.DATABASE_API_URL;
  if (!base) return NextResponse.json({ error: 'DATABASE_API_URL is not configured' }, { status: 503 });
  try {
    const upstream = await fetch(`${base.replace(/\/$/, '')}/api/${table}${id.length ? `/${id[0]}` : ''}`, {
      method: request.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PATCH'].includes(request.method) ? JSON.stringify(await request.json()) : undefined,
      cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'Cannot reach the database API. Check its address and that Express is running.' }, { status: 502 });
  }
}
export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
