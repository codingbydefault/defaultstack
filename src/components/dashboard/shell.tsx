'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { PortalIdentity } from '@/lib/auth/portal';
import { ThemeToggle } from '@/components/theme-toggle';

export function Shell({ mock, identity, children }: { mock: boolean; identity: PortalIdentity; children: React.ReactNode }) {
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);
  const projectsActive = pathname === '/app' || pathname.startsWith('/app/projects');
  const pageLabel = pathname.startsWith('/app/projects/new') ? 'Nieuw project' : pathname.startsWith('/app/projects/') ? 'Projectdetails' : pathname === '/app/mail' ? 'E-mail' : pathname === '/app/admin' ? 'Beheer' : pathname === '/app/profile' ? 'Profiel' : 'Overzicht';

  async function logout() {
    setLeaving(true);
    if (identity.kind === 'customer') await fetch('/api/auth/sign-out', { method: 'POST' });
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/app/login');
  }

  return (
    <main className="platform-console" lang="nl">
      <div className="console-ambient ambient-one" aria-hidden="true" />
      <div className="console-ambient ambient-two" aria-hidden="true" />
      <div className="floating-shapes console-shapes" aria-hidden="true"><span /><span /><span /></div>
      <aside className="console-sidebar">
        <Link href="/app" className="console-brand">
          <span className="brand-icon"><i /><i /><i /></span>
          <span>Default<span className="accent">Stackr</span><small>YOUR STACK. YOUR CLOUD.</small></span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">D</span>
          <div>{identity.kind === 'admin' ? 'DefaultStackr' : identity.name}<small>{identity.kind === 'admin' ? 'Beheerwerkruimte' : identity.owner ? 'Eigenaarsprofiel · onbeperkt' : 'Jouw werkruimte'}</small></div>
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
          <Link href="/app/mail" className={pathname === '/app/mail' ? 'active' : ''} aria-current={pathname === '/app/mail' ? 'page' : undefined}>
            <span aria-hidden="true">✉</span>E-mail
          </Link>
        </nav>
        <div className="sidebar-bottom">
          {mock && <span className="mock-pill">Mock-modus</span>}
          <span className="local-pill"><span className="pulse-dot" /> Eigen infrastructuur</span>
          <p>Je projecten, code en data<br />onder één dak.</p>
          <Link href="https://defaultstackr.nl/prijzen">Pakketten en verbruik ↗</Link>
          <Link href="https://defaultstackr.nl">← Publieke site</Link>
        </div>
      </aside>
      <section className="console-body">
        <header className="console-header">
          <div className="console-breadcrumb"><span>Werkruimte</span><b>/</b><strong>{pageLabel}</strong></div>
          <div className="console-header-actions">
            <ThemeToggle />
            {mock && <span className="mock-pill">Voorbeelddata</span>}
            <span className="header-live"><span className="pulse-dot" /> PORTAAL ACTIEF</span>
            <Link href="https://defaultstackr.nl">Site</Link>
            <Link href="https://defaultstackr.nl/prijzen">Pakketten</Link>
            <button type="button" onClick={() => void logout()} disabled={leaving}>{leaving ? 'Bezig…' : 'Uitloggen'}</button>
          </div>
        </header>
        <div className="console-content">{children}</div>
      </section>
    </main>
  );
}
