'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Availability = { available: boolean; githubSignIn?: boolean; githubSignInHref?: string | null };

export function CustomerAuthForm({ initialMode = 'login', githubSignIn = false, githubSignInHref = '/api/auth/github' }: { initialMode?: 'login' | 'register'; githubSignIn?: boolean; githubSignInHref?: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(githubSignIn ? 'ready' : 'loading');
  const [githubHref, setGithubHref] = useState(githubSignInHref);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (githubSignIn) return;
    const controller = new AbortController();
    setStatus('loading');
    fetch('https://defaultstackr.cloud/api/customer-entry/status', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('unavailable');
        const body = await response.json() as Availability;
        const href = new URL(body.githubSignInHref || '', 'https://defaultstackr.cloud');
        if (!body.available || !body.githubSignIn || href.origin !== 'https://defaultstackr.cloud' || href.pathname !== '/api/auth/github') throw new Error('unavailable');
        setGithubHref(href.href);
        setStatus('ready');
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [githubSignIn, attempt]);

  return <div className="customer-auth-form">
    {status === 'ready' && <div className="auth-social-list">
      <a className="auth-social auth-social-github" href={githubHref}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.6-1.3 5.6-6A4.7 4.7 0 0 0 18.5 6a4.3 4.3 0 0 0-.1-3.5S17.3 2.2 15 3.8a12 12 0 0 0-6 0C6.7 2.2 5.6 2.5 5.6 2.5A4.3 4.3 0 0 0 5.5 6a4.7 4.7 0 0 0-1.3 3.6c0 4.7 2.9 5.7 5.6 6A3 3 0 0 0 9 18v3.3" /></svg>
        {initialMode === 'register' ? 'Account aanmaken met GitHub' : 'Inloggen met GitHub'}
        <svg className="auth-link-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
      </a>
      <p className="auth-disclaimer">{initialMode === 'register' ? 'Je maakt je profiel aan met je GitHub-account.' : 'Gebruik je GitHub-account om je projecten te beheren.'}</p>
    </div>}
    {status === 'loading' && <p role="status" className="auth-availability">GitHub-aanmelding laden…</p>}
    {status === 'error' && <div className="auth-recovery"><p role="status">GitHub-aanmelding is tijdelijk niet beschikbaar. Probeer het opnieuw.</p><button type="button" className="outline" onClick={() => setAttempt(value => value + 1)}>Opnieuw proberen</button></div>}
    <p className="auth-disclaimer">Bekijk vóór het aanmaken van een account onze <Link href="/voorwaarden">algemene voorwaarden</Link> en <Link href="/privacy">privacyverklaring</Link>.</p>
  </div>;
}
