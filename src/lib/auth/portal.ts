import { cookies, headers } from 'next/headers';
import { SESSION_COOKIE, readSession } from '@/lib/auth/session';
import { customerSession } from '@/lib/auth/customer';

export type PortalIdentity = { kind: 'admin' } | { kind: 'customer'; id: string; name: string };

export async function portalIdentity(): Promise<PortalIdentity | null> {
  const jar = await cookies();
  if (await readSession(jar.get(SESSION_COOKIE)?.value)) return { kind: 'admin' };
  const session = await customerSession(await headers());
  return session?.user ? { kind: 'customer', id: session.user.id, name: session.user.name } : null;
}
