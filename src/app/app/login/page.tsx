import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/dashboard/login-form';
import { passwordHashConfigured } from '@/lib/auth/password';
import { SESSION_COOKIE, readSession, safeNextPath, sessionSecret } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, jar] = await Promise.all([searchParams, cookies()]);
  const destination = safeNextPath(next);
  if (await readSession(jar.get(SESSION_COOKIE)?.value)) redirect(destination);

  return (
    <main className="login-shell" lang="nl">
      <div className="ambient a" />
      <div className="ambient b" />
      <div className="floating-shapes login-shapes" aria-hidden="true"><span /><span /><span /></div>
      <Link href="/" className="brand login-brand">
        <span className="brand-icon"><i /><i /><i /></span>
        <span>Default<span className="accent">Stackr</span><small>by CodedByDefault</small></span>
      </Link>
      <LoginForm configured={passwordHashConfigured() && Boolean(sessionSecret())} nextPath={destination} />
    </main>
  );
}
