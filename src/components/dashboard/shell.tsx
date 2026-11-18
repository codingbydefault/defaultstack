'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function Shell({ mock, children }: { mock: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);
  const projectsActive = pathname === '/app' || pathname.startsWith('/app/projects');
  const pageLabel = pathname.startsWith('/app/projects/new') ? 'Nieuw project' : pathname.startsWith('/app/projects/') ? 'Projectdetails' : 'Overzicht';

  async function logout() {
    setLeaving(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/app/login');
  }

  return (
    <main className="platform-console" lang="nl">
      <div className="console-ambient ambient-one" aria-hidden="true" />
      <div className="console-ambient ambient-two" aria-hidden="true" />
      <aside className="console-sidebar">
        <Link href="/app" className="console-brand">
          <span className="brand-icon"><i /><i /><i /></span>
          <span>Default<span className="accent">Stackr</span><small>YOUR STACK. YOUR CLOUD.</small></span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">D</span>
          <div>DefaultStackr<small>Beheerwerkruimte</small></div>
          <span className="workspace-dot" />
        </div>
        <p className="console-label">WERKRUIMTE</p>
        <nav aria-label="Beheer">
          <Link href="/app" className={projectsActive ? 'active' : ''} aria-current={projectsActive ? 'page' : undefined}>
            <span aria-hidden="true">▦</span>Projecten
          </Link>
          <Link href="/app/profile" className={pathname === '/app/profile' ? 'active' : ''} aria-current={pathname === '/app/profile' ? 'page' : undefined}>
            <span aria-hidden="true">◉</span>Profiel en valuta
          </Link>
        </nav>
        <div className="sidebar-bottom">
          {mock && <span className="mock-pill">Mock-modus</span>}
          <span className="local-pill"><span className="pulse-dot" /> Eigen infrastructuur</span>
          <p>Je projecten, code en data<br />onder één dak.</p>
          <Link href="/prijzen">Pakketten en verbruik ↗</Link>
          <Link href="/">← Publieke site</Link>
        </div>
      </aside>
      <section className="console-body">
        <header className="console-header">
          <div className="console-breadcrumb"><span>Werkruimte</span><b>/</b><strong>{pageLabel}</strong></div>
          <div className="console-header-actions">
            {mock && <span className="mock-pill">Voorbeelddata</span>}
            <span className="header-live"><span className="pulse-dot" /> PORTAAL ACTIEF</span>
            <Link href="/">Site</Link>
            <Link href="/prijzen">Pakketten</Link>
            <button type="button" onClick={() => void logout()} disabled={leaving}>{leaving ? 'Bezig…' : 'Uitloggen'}</button>
          </div>
        </header>
        <div className="console-content">{children}</div>
      </section>
    </main>
  );
}
