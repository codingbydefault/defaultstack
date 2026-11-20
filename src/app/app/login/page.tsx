import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/dashboard/login-form';
import { CustomerAuthForm } from '@/components/customer-auth-form';
import { passwordHashConfigured } from '@/lib/auth/password';
import { SESSION_COOKIE, readSession, safeNextPath, sessionSecret } from '@/lib/auth/session';
import { customerSession } from '@/lib/auth/customer';
import { githubSignInConfigured, githubSignInHref } from '@/lib/auth/github-signin.mjs';
import { headers } from 'next/headers';
import { ThemeToggle } from '@/components/theme-toggle';

export const dynamic = 'force-dynamic';

function authNotice(result: string | undefined, error: string | undefined): string | null {
  const code = error || result;
  if (!code) return null;
  if (code === 'unavailable') return 'Klantaanmelding wordt nog ingesteld op de server. Probeer het later opnieuw.';
  if (code === 'invalid') return 'Controleer je e-mailadres en wachtwoord.';
  if (code === 'github_unavailable') return 'GitHub-aanmelding is nog niet ingesteld.';
  if (code === 'state_mismatch' || code === 'state_not_found' || code === 'state_security_mismatch' || code === 'state_invalid') return 'De GitHub-aanmelding is verlopen of ongeldig. Probeer het opnieuw.';
  if (code === 'unable_to_get_user_info' || code === 'email_not_found' || code === 'email_not_verified' || code === 'no_email') return 'GitHub gaf geen geverifieerd primair e-mailadres. Aanmelden is gestopt.';
  if (code === 'account_not_linked') return 'Dit e-mailadres hoort bij een account dat nog niet is bevestigd. Log in met je wachtwoord.';
  if (code.startsWith('github') || code === 'oauth_code_verification_failed' || code === 'invalid_code' || code === 'no_code') return 'Aanmelden met GitHub is mislukt. Probeer het opnieuw.';
  return 'Aanmelden is mislukt. Probeer het opnieuw.';
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; admin?: string; provider?: string; result?: string; error?: string }> }) {
  const [{ next, admin, provider, result, error }, jar] = await Promise.all([searchParams, cookies()]);
  const destination = safeNextPath(next);
  const notice = authNotice(result, error);
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
      <div className="login-theme-control"><ThemeToggle /></div>
      {admin === '1' ? <LoginForm configured={passwordHashConfigured() && Boolean(sessionSecret())} nextPath={destination} /> :
        <section className="login-card customer-login-card"><p className="console-eyebrow">DEFAULTSTACKR / WERKRUIMTE</p><h1>Welkom bij jouw stack.</h1><p>Log in of maak een account om je projecten te beheren.</p>{notice && <p role="alert" className="db-error">{notice}</p>}<CustomerAuthForm provider={provider} githubSignIn={githubSignInConfigured()} githubSignInHref={githubSignInHref()} /></section>}
    </main>
  );
}
