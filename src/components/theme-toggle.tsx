'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const storageKey = 'defaultstackr-theme';
const changeEvent = 'defaultstackr-theme-change';

export function ThemeToggle({ language = 'nl' }: { language?: 'nl' | 'en' } = {}) {
  const en = language === 'en';
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const syncTheme = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    syncTheme();
    window.addEventListener(changeEvent, syncTheme);
    return () => window.removeEventListener(changeEvent, syncTheme);
  }, []);

  function toggle() {
    const next: Theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem(storageKey, next); } catch { /* The switch still works when storage is unavailable. */ }
    setTheme(next);
    window.dispatchEvent(new Event(changeEvent));
  }

  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={theme === 'dark' ? (en ? 'Switch to light theme' : 'Licht thema inschakelen') : (en ? 'Switch to dark theme' : 'Donker thema inschakelen')} aria-pressed={theme === 'dark'}>
    <svg className="theme-toggle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {theme === 'dark' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></> : <path d="M20.2 15.2A8.4 8.4 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" />}
    </svg>
    <span className="theme-toggle-label">{theme === 'dark' ? (en ? 'Light' : 'Licht') : (en ? 'Dark' : 'Donker')}</span>
  </button>;
}
