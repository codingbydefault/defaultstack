import { rejectsCrossSite } from '@/lib/auth/guard';
import { portalIdentity } from '@/lib/auth/portal';
import { handleStack } from '@/lib/api/handler';

export const dynamic = 'force-dynamic';

async function dispatch(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const identity = await portalIdentity();
  if (!identity) {
    return Response.json({ error: 'Niet ingelogd.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD' && rejectsCrossSite(request)) {
    return Response.json({ error: 'Ongeldige herkomst.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const { path } = await context.params;
  return handleStack(request, path, identity.kind === 'customer' ? identity.id : null);
}

export { dispatch as GET, dispatch as POST, dispatch as PATCH, dispatch as DELETE };
