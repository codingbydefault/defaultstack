'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { PublicAuthActions } from '@/components/public-auth-actions';

const links = [
  { href: '/#platform', label: 'Platform' },
  { href: '/#werkwijze', label: 'Werkwijze' },
  { href: '/prijzen', label: 'Pakketten' },
  { href: '/#voortgang', label: 'Voortgang' },
  { href: '/#reviews', label: 'Reviews' },
];

export function SiteMenu() {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1101px)');
    const closeOnDesktop = () => { if (desktop.matches && details.current) details.current.open = false; };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  return <details className="responsive-nav" ref={details}>
    <summary><span aria-hidden="true">☰</span> Menu</summary>
    <nav aria-label="Mobiele navigatie">
      {links.map(link => <Link key={link.href} href={link.href} onClick={() => { if (details.current) details.current.open = false; }}>{link.label}</Link>)}
      <div className="mobile-menu-actions">
        <PublicAuthActions onDialogClose={() => { if (details.current) details.current.open = false; }} />
      </div>
    </nav>
  </details>;
}
