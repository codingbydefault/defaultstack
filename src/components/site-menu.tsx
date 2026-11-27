'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { PublicAuthActions } from '@/components/public-auth-actions';

export function SiteMenu({ language = 'nl' }: { language?: 'nl' | 'en' } = {}) {
  const en = language === 'en';
  const links = [
    { href: '/#platform', label: 'Platform' },
    { href: '/#werkwijze', label: en ? 'How it works' : 'Werkwijze' },
    { href: en ? '/pricing' : '/prijzen', label: en ? 'Plans' : 'Pakketten' },
    { href: '/#voortgang', label: en ? 'Progress' : 'Voortgang' },
    { href: '/#reviews', label: 'Reviews' },
  ];
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1101px)');
    const closeOnDesktop = () => { if (desktop.matches && details.current) details.current.open = false; };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && details.current?.open) {
        details.current.open = false;
        details.current.querySelector('summary')?.focus();
      }
    };
    const closeOnOutside = (event: PointerEvent) => {
      if (details.current?.open && event.target instanceof Node && !details.current.contains(event.target)) details.current.open = false;
    };
    desktop.addEventListener('change', closeOnDesktop);
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutside);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutside);
    };
  }, []);
  return <details className="responsive-nav" ref={details}>
    <summary><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg> Menu</summary>
    <nav aria-label={en ? 'Mobile navigation' : 'Mobiele navigatie'}>
      {links.map(link => <Link key={link.href} href={link.href} onClick={() => { if (details.current) details.current.open = false; }}>{link.label}</Link>)}
      <div className="mobile-menu-actions"><PublicAuthActions language={language} onDialogClose={() => { if (details.current) details.current.open = false; }} /></div>
    </nav>
  </details>;
}
