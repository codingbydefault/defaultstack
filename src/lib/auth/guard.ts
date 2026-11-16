import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LOGIN_TARGET_HEADER, SESSION_COOKIE, readSession, safeLoginLocation } from '@/lib/auth/session';

export function redirectToLogin(target: string | null | undefined): never {
  redirect(safeLoginLocation(target));
}

export async function requireSession(): Promise<void> {
  const jar = await cookies();
  const ok = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!ok) redirectToLogin((await headers()).get(LOGIN_TARGET_HEADER));
}

export function rejectsCrossSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return true;
  try {
    return new URL(origin).host !== host.split(',')[0]?.trim();
  } catch {
    return true;
  }
}

export function clientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'local';
}
