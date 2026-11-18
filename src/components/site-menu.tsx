'use client';

import Link from 'next/link';
import { useRef } from 'react';

const links = [
  { href: '/#platform', label: 'Platform' },
  { href: '/#werkwijze', label: 'Werkwijze' },
  { href: '/prijzen', label: 'Pakketten' },
  { href: '/#voortgang', label: 'Voortgang' },
  { href: '/#reviews', label: 'Reviews' },
];

export function SiteMenu() {
  const details = useRef<HTMLDetailsElement>(null);
  return <details className="responsive-nav" ref={details}>
    <summary><span aria-hidden="true">☰</span> Menu</summary>
    <nav aria-label="Mobiele navigatie">
      {links.map(link => <Link key={link.href} href={link.href} onClick={() => { if (details.current) details.current.open = false; }}>{link.label}</Link>)}
    </nav>
  </details>;
}
