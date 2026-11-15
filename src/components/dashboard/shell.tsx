'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function Shell({ mock, children }: { mock: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);
  const projectsActive = pathname === '/app' || pathname.startsWith('/app/projects');

  async function logout() {
    setLeaving(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/app/login');
  }

  return (
    <main className="platform-console" lang="nl">
      <aside className="console-sidebar">
        <Link href="/app" className="console-brand">
          <span className="brand-icon"><i /><i /><i /></span>
          <span>Default<span className="accent">Stackr</span><small>BEHEER</small></span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">B</span>
          <div>Beheer<small>Eén admin-sessie</small></div>
          <span className="workspace-dot" />
        </div>
        <p className="console-label">CONSOLE</p>
        <nav aria-label="Beheer">
          <Link href="/app" className={projectsActive ? 'active' : ''} aria-current={projectsActive ? 'page' : undefined}>
            <span aria-hidden="true">▦</span>Projecten
          </Link>
        </nav>
        <div className="sidebar-bottom">
          {mock && <span className="mock-pill">Mock-modus</span>}
          <span className="local-pill">● Self-hosted</span>
          <p>Projecten horen bij een team.<br />Een domein maar bij één project.</p>
          <Link href="/">← Publieke site</Link>
        </div>
      </aside>
      <section className="console-body">
        <header className="console-header">
          <div><span>Beheer</span><b>/</b><strong>Projecten</strong></div>
          <div className="console-header-actions">
            {mock && <span className="mock-pill">Voorbeelddata</span>}
            <Link href="/">Site</Link>
            <button type="button" onClick={() => void logout()} disabled={leaving}>{leaving ? 'Bezig…' : 'Uitloggen'}</button>
          </div>
        </header>
        <div className="console-content">{children}</div>
      </section>
    </main>
  );
}
