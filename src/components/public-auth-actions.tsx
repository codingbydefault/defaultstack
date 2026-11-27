'use client';

import { useId, useRef, useState } from 'react';
import { CustomerAuthForm } from '@/components/customer-auth-form';
import { ThemeToggle } from '@/components/theme-toggle';

export function PublicAuthActions({ onDialogClose, language = 'nl' }: { onDialogClose?: () => void; language?: 'nl' | 'en' } = {}) {
  const en = language === 'en';
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitle = useId();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  function open(next: 'login' | 'register') {
    setMode(next);
    dialog.current?.showModal();
  }
  const languages = <label className="language-control"><span className="sr-only">{en ? 'Language' : 'Taal'}</span><select aria-label={en ? 'Language' : 'Taal'} value={language} onChange={event => {
    const target = new URL(event.target.value === 'en' ? 'https://defaultstackr.online' : 'https://defaultstackr.nl');
    const current = new URL(window.location.href);
    if (['/', '/prijzen', '/pricing', '/privacy', '/voorwaarden', '/terms'].includes(current.pathname)) {
      target.pathname = current.pathname; target.search = current.search; target.hash = current.hash;
    }
    window.location.assign(target.href);
  }}><option value="nl">NL</option><option value="en">EN</option></select></label>;
  if (en) return <div className="public-auth-actions"><ThemeToggle language="en" />{languages}
    <a href="https://defaultstackr.cloud/app/login" className="auth-nav-login">Sign in</a>
    <a href="https://defaultstackr.cloud/app/login?mode=register" className="primary auth-nav-register" aria-label="Create account"><span className="auth-register-full">Create account</span><span className="auth-register-short">Sign up</span> ↗</a>
  </div>;
  return <div className="public-auth-actions">
    <ThemeToggle language={language} />
    {languages}
    <button type="button" className="auth-nav-login" onClick={() => open('login')}>Aanmelden</button>
    <button type="button" className="primary auth-nav-register" aria-label="Account aanmaken" onClick={() => open('register')}><span className="auth-register-full">Account aanmaken</span><span className="auth-register-short">Aanmaken</span> ↗</button>
    <dialog ref={dialog} className="auth-dialog" aria-labelledby={dialogTitle} onClose={onDialogClose} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="auth-dialog-inner">
        <button type="button" className="auth-dialog-close" aria-label="Sluiten" onClick={() => dialog.current?.close()}>×</button>
        <span className="section-label">/ WELKOM BIJ DEFAULTSTACKR</span>
        <h2 id={dialogTitle}>{mode === 'register' ? 'Maak je account aan.' : 'Welkom terug.'}</h2>
        <p>Je projecten en data op één plek, onder jouw eigen profiel.</p>
        <CustomerAuthForm key={mode} initialMode={mode} />
      </div>
    </dialog>
  </div>;
}
