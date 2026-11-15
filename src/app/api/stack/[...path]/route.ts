import { cookies } from 'next/headers';
import { rejectsCrossSite } from '@/lib/auth/guard';
import { SESSION_COOKIE, readSession } from '@/lib/auth/session';
import { handleStack } from '@/lib/api/handler';

export const dynamic = 'force-dynamic';

async function dispatch(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const jar = await cookies();
  if (!(await readSession(jar.get(SESSION_COOKIE)?.value))) {
    return Response.json({ error: 'Niet ingelogd.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD' && rejectsCrossSite(request)) {
    return Response.json({ error: 'Ongeldige herkomst.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const { path } = await context.params;
  return handleStack(request, path);
}

export { dispatch as GET, dispatch as POST, dispatch as PATCH, dispatch as DELETE };
