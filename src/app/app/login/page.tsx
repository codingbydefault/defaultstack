import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/dashboard/login-form';
import { CustomerAuthForm } from '@/components/customer-auth-form';
import { passwordHashConfigured } from '@/lib/auth/password';
import { SESSION_COOKIE, readSession, safeNextPath, sessionSecret } from '@/lib/auth/session';
import { customerSession } from '@/lib/auth/customer';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; admin?: string; provider?: string; result?: string }> }) {
  const [{ next, admin, provider, result }, jar] = await Promise.all([searchParams, cookies()]);
  const destination = safeNextPath(next);
  if (admin === '1') {
    if (await readSession(jar.get(SESSION_COOKIE)?.value)) redirect(destination);
  } else if (await customerSession(await headers())) {
    redirect(destination);
  }

  return (
    <main className="login-shell" lang="nl">
      <div className="ambient a" />
      <div className="ambient b" />
      <div className="floating-shapes login-shapes" aria-hidden="true"><span /><span /><span /></div>
      <Link href="/" className="brand login-brand">
        <span className="brand-icon"><i /><i /><i /></span>
        <span>Default<span className="accent">Stackr</span><small>by CodedByDefault</small></span>
      </Link>
      {admin === '1' ? <LoginForm configured={passwordHashConfigured() && Boolean(sessionSecret())} nextPath={destination} /> :
        <section className="login-card customer-login-card"><p className="console-eyebrow">DEFAULTSTACKR / WERKRUIMTE</p><h1>Welkom bij jouw stack.</h1><p>Log in of maak een account om je projecten te beheren.</p>{result && <p role="alert" className="db-error">{result === 'invalid' ? 'Controleer je e-mailadres en wachtwoord.' : 'Aanmelden is mislukt. Probeer het opnieuw.'}</p>}<CustomerAuthForm provider={provider} /></section>}
    </main>
  );
}
