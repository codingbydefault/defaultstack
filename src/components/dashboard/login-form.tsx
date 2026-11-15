'use client';

import { FormEvent, useState } from 'react';

export function LoginForm({ configured, nextPath }: { configured: boolean; nextPath: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Inloggen mislukt.');
      window.location.assign(nextPath);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Inloggen mislukt.');
      setBusy(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <p className="console-eyebrow">DEFAULTSTACKR / BEHEER</p>
      <h1>Inloggen</h1>
      <p>Het beheerwachtwoord staat alleen op de server. De API-sleutel komt niet in de browser.</p>
      {!configured && <p role="status" className="db-warning">Zet DEFAULTSTACKR_ADMIN_PASSWORD_HASH en DEFAULTSTACKR_SESSION_SECRET in de serveromgeving.</p>}
      <label>
        Wachtwoord
        <input
          required
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          disabled={!configured || busy}
        />
      </label>
      {error && <p role="alert" className="db-error">{error}</p>}
      <button className="primary" type="submit" disabled={!configured || busy}>{busy ? 'Bezig…' : 'Inloggen'}</button>
    </form>
  );
}
