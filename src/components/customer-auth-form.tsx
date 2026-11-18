'use client';

import { useEffect, useState } from 'react';
import { createAuthClient } from 'better-auth/react';

const cloud = 'https://www.defaultstackr.cloud';
const authClient = createAuthClient();

export function CustomerAuthForm({ initialMode = 'login', provider }: { initialMode?: 'login' | 'register'; provider?: string }) {
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState('');

  useEffect(() => {
    if (provider !== 'github' && provider !== 'google') return;
    if (window.location.origin !== cloud && !window.location.hostname.startsWith('localhost')) return;
    void authClient.signIn.social({ provider, callbackURL: '/app' }).then(result => {
      if (result.error) setError('Aanmelden met deze aanbieder is nog niet beschikbaar.');
    }).catch(() => setError('Aanmelden met deze aanbieder is mislukt.'));
  }, [provider]);

  return <div className="customer-auth-form">
    <div className="auth-social-list">
      <form action={`${cloud}/api/customer-entry/social`} method="post"><input type="hidden" name="provider" value="github" /><button type="submit" className="auth-social auth-social-github"><span aria-hidden="true">⌘</span>Verder met GitHub <b aria-hidden="true">↗</b></button></form>
      <form action={`${cloud}/api/customer-entry/social`} method="post"><input type="hidden" name="provider" value="google" /><button type="submit" className="auth-social auth-social-google"><span aria-hidden="true">G</span>Verder met Google <b aria-hidden="true">↗</b></button></form>
    </div>
    <div className="auth-divider"><span>OF MET E-MAIL</span></div>
    <form action={`${cloud}/api/customer-entry`} method="post">
      <input type="hidden" name="mode" value={mode} />
      <label>E-mailadres<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="jij@bedrijf.nl" /></label>
      <label>Wachtwoord<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={10} maxLength={200} placeholder="Minstens 10 tekens" /></label>
      <button type="submit" className="primary">{mode === 'register' ? 'Account aanmaken' : 'Inloggen met e-mail'} <span aria-hidden="true">↗</span></button>
    </form>
    {error && <p role="alert" className="db-error">{error}</p>}
    <p className="auth-switch">{mode === 'login' ? 'Nog geen account?' : 'Heb je al een account?'} <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Account aanmaken' : 'Inloggen'}</button></p>
    <p className="auth-disclaimer">GitHub is de standaard voor projecten. Met Google of e-mail kun je later GitHub aan je profiel koppelen.</p>
  </div>;
}
