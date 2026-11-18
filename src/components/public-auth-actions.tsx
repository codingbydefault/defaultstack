'use client';

import { useRef, useState } from 'react';
import { CustomerAuthForm } from '@/components/customer-auth-form';

export function PublicAuthActions() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  function open(next: 'login' | 'register') {
    setMode(next);
    dialog.current?.showModal();
  }
  return <div className="public-auth-actions">
    <label className="language-control"><span className="sr-only">Taal</span><select aria-label="Taal" defaultValue="nl"><option value="nl">NL</option><option value="en" disabled>EN · binnenkort</option></select></label>
    <button type="button" className="auth-nav-login" onClick={() => open('login')}>Aanmelden</button>
    <button type="button" className="primary auth-nav-register" onClick={() => open('register')}>Account aanmaken ↗</button>
    <dialog ref={dialog} className="auth-dialog" aria-labelledby="auth-dialog-title" onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="auth-dialog-inner">
        <button type="button" className="auth-dialog-close" aria-label="Sluiten" onClick={() => dialog.current?.close()}>×</button>
        <span className="section-label">/ WELKOM BIJ DEFAULTSTACKR</span>
        <h2 id="auth-dialog-title">{mode === 'register' ? 'Maak je account aan.' : 'Welkom terug.'}</h2>
        <p>Je projecten en data op één plek, onder jouw eigen profiel.</p>
        <CustomerAuthForm key={mode} initialMode={mode} />
      </div>
    </dialog>
  </div>;
}
