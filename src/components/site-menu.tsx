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
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  return <details className="responsive-nav" ref={details}>
    <summary><span aria-hidden="true">☰</span> Menu</summary>
    <nav aria-label={en ? 'Mobile navigation' : 'Mobiele navigatie'}>
      {links.map(link => <Link key={link.href} href={link.href} onClick={() => { if (details.current) details.current.open = false; }}>{link.label}</Link>)}
      <div className="mobile-menu-actions"><PublicAuthActions language={language} onDialogClose={() => { if (details.current) details.current.open = false; }} /></div>
    </nav>
  </details>;
}
