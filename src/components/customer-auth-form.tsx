'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createAuthClient } from 'better-auth/react';

const cloud = 'https://www.defaultstackr.cloud';
const authClient = createAuthClient();
type Availability = { available: boolean; github: boolean; google: boolean; githubSignIn?: boolean; githubSignInHref?: string | null };

export function CustomerAuthForm({ initialMode = 'login', provider, githubSignIn = false, githubSignInHref = '/api/auth/github' }: { initialMode?: 'login' | 'register'; provider?: string; githubSignIn?: boolean; githubSignInHref?: string }) {
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [showGithub, setShowGithub] = useState(githubSignIn);
  const [githubHref, setGithubHref] = useState(githubSignInHref);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${cloud}/api/customer-entry/status`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('unavailable');
        return response.json() as Promise<Availability>;
      })
      .then(body => {
        setAvailability(body);
        if (!githubSignIn && body.githubSignIn && body.githubSignInHref) {
          setShowGithub(true);
          setGithubHref(body.githubSignInHref);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setAvailability({ available: false, github: false, google: false }); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (githubSignIn) return undefined;
    const controller = new AbortController();
    fetch('/api/customer-entry/status', { cache: 'no-store', signal: controller.signal })
      .then(async response => response.ok ? response.json() as Promise<Availability> : null)
      .then(body => {
        if (body?.githubSignIn && body.githubSignInHref) {
          setShowGithub(true);
          setGithubHref(body.githubSignInHref);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [githubSignIn]);

  useEffect(() => {
    if (provider !== 'github' && provider !== 'google') return;
    if (window.location.origin !== cloud && !window.location.hostname.startsWith('localhost')) return;
    void authClient.signIn.social({ provider, callbackURL: '/app' }).then(result => {
      if (result.error) setError('Aanmelden met deze aanbieder is nog niet beschikbaar.');
    }).catch(() => setError('Aanmelden met deze aanbieder is mislukt.'));
  }, [provider]);

  return <div className="customer-auth-form">
    {availability && !availability.available && <p role="status" className="auth-availability">Klantaanmelding wordt nog ingesteld op de server. Probeer het later opnieuw.</p>}
    <div className="auth-social-list">
      {/* Anchor, not a form. A form whose response redirects to GitHub is blocked when form-action is 'self'. */}
      {showGithub && <a className="auth-social auth-social-github" href={githubHref}><span aria-hidden="true">⌘</span>Inloggen met GitHub <b aria-hidden="true">↗</b></a>}
      <form action={`${cloud}/api/customer-entry/social`} method="post"><input type="hidden" name="provider" value="github" /><button type="submit" disabled={!availability?.github} className="auth-social auth-social-github"><span aria-hidden="true">⌘</span>Verder met GitHub <b aria-hidden="true">↗</b></button></form>
      <form action={`${cloud}/api/customer-entry/social`} method="post"><input type="hidden" name="provider" value="google" /><button type="submit" disabled={!availability?.google} className="auth-social auth-social-google"><span aria-hidden="true">G</span>Verder met Google <b aria-hidden="true">↗</b></button></form>
    </div>
    {availability?.available && !availability.github && <p className="auth-availability">GitHub-aanmelding is nog niet gekoppeld door de beheerder.</p>}
    <div className="auth-divider"><span>OF MET E-MAIL</span></div>
    <form action={`${cloud}/api/customer-entry`} method="post">
      <input type="hidden" name="mode" value={mode} />
      <label>E-mailadres<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="jij@bedrijf.nl" /></label>
      <label>Wachtwoord<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={10} maxLength={200} placeholder="Minstens 10 tekens" /></label>
      <button type="submit" className="primary" disabled={!availability?.available}>{mode === 'register' ? 'Account aanmaken' : 'Inloggen met e-mail'} <span aria-hidden="true">↗</span></button>
    </form>
    {error && <p role="alert" className="db-error">{error}</p>}
    <p className="auth-switch">{mode === 'login' ? 'Nog geen account?' : 'Heb je al een account?'} <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Account aanmaken' : 'Inloggen'}</button></p>
    <p className="auth-disclaimer">GitHub is de standaard voor projecten. Met Google of e-mail kun je later GitHub aan je profiel koppelen.</p>
    <p className="auth-disclaimer">Bekijk vóór het aanmaken van een account onze <Link href="/voorwaarden">algemene voorwaarden</Link> en <Link href="/privacy">privacyverklaring</Link>.</p>
  </div>;
}
