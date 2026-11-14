'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useRef, useState } from 'react';
import type { PlatformStatus } from '@/lib/platform-status';
const DatabaseEditor = dynamic(() => import('./database-editor'), { loading: () => <p role="status">Opening table editor…</p> });
type View = 'Overview' | 'Deployments' | 'Database' | 'Migrations & RLS' | 'Settings';
const navigation: { name: View; symbol: string }[] = [
  { name: 'Overview', symbol: '◈' }, { name: 'Deployments', symbol: '↗' }, { name: 'Database', symbol: '▤' },
  { name: 'Migrations & RLS', symbol: '⌘' }, { name: 'Settings', symbol: '⚙' },
];
const empty: PlatformStatus = { connected: false, generatedAt: null, stale: false, deployments: [] };
const quote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;

function CopyCommand({ text }: { text: string }) {
  const [state, setState] = useState('Copy');
  return <div className="command"><pre><code>{text}</code></pre><button aria-label="Copy command" onClick={async () => { try { await navigator.clipboard.writeText(text); setState('Copied'); } catch { setState('Select text to copy'); } }}>{state}</button></div>;
}

export default function PlatformWorkspace() {
  const [view, setView] = useState<View>('Overview');
  const [status, setStatus] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState('');
  const [wizard, setWizard] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (wizard) dialog.current?.showModal(); }, [wizard]);
  const [name, setName] = useState('hello');
  const [source, setSource] = useState('examples/hello-app');
  const [port, setPort] = useState('3200');
  const [command, setCommand] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/platform', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load server status');
        const data = await response.json();
        if (active) { setStatus(data); setError(''); }
      } catch (e) { if (active && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'Server status unavailable'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [refresh]);
  const running = status.deployments.filter(app => app.state === 'running').length;
  const apps = status.deployments.filter(app => app.name.toLowerCase().includes(filter.toLowerCase()));
  function prepare(event: FormEvent) {
    event.preventDefault();
    setCommand(`bash deploy/apps/deploy.sh ${quote(name)} ${quote(source.trim())} ${quote(port)}\nnode deploy/apps/export-status.mjs`);
  }
  return <main className="platform-console db-shell">
    <aside className="console-sidebar"><Link href="/" className="console-brand"><span className="brand-icon"><i/><i/><i/></span><span>Default<span className="accent">Stack</span><small>YOUR OWN CLOUD</small></span></Link>
      <div className="workspace-switch"><span className="workspace-avatar">C</span><div>CodedByDefault<small>Personal workspace</small></div><span className="workspace-dot"/></div>
      <p className="console-label">WORKSPACE</p><nav aria-label="Platform navigation">{navigation.map(item => <button key={item.name} className={view === item.name ? 'active' : ''} aria-current={view === item.name ? 'page' : undefined} onClick={() => { setView(item.name); setSelected(null); }}><span aria-hidden="true">{item.symbol}</span>{item.name}</button>)}</nav>
      <div className="sidebar-bottom"><span className="local-pill">● Self-hosted edition</span><p>Your code. Your data.<br/>Your infrastructure.</p><Link href="/">← Public website</Link></div>
    </aside>
    <section className="console-body"><header className="console-header"><div><span>Workspace</span><b>/</b><strong>{view}</strong></div><div className="console-header-actions"><span className="environment">Home server</span><span className="user-avatar" aria-label="CodedByDefault workspace">C</span></div></header>
      <div className="console-content"><div className="console-page-heading"><div><p className="console-eyebrow">DEFAULTSTACK / PLATFORM</p><h1>{view === 'Overview' ? 'Build something of your own.' : view}</h1><p>{view === 'Overview' ? 'One workspace for your applications, deployments and data.' : view === 'Deployments' ? 'Follow the applications running on your own infrastructure.' : view === 'Database' ? 'Explore and manage the data behind your applications.' : view === 'Migrations & RLS' ? 'Version your schema. Keep every owner’s data separate.' : 'Connect your infrastructure to this workspace.'}</p></div>{['Overview', 'Deployments'].includes(view) && <button className="primary" onClick={() => { setWizard(true); setCommand(''); }}>+ Deploy application</button>}</div>
      {error && <p role="alert" className="db-error">{error} <button onClick={() => setRefresh(value => value + 1)}>Retry</button></p>}
      {view === 'Overview' && <><div className="console-banner"><div className="banner-orb"/><span className="banner-kicker">INDEPENDENT BY DESIGN</span><h2>A home for your next idea.</h2><p>Deploy applications and manage PostgreSQL<br/>on infrastructure you control.</p><button onClick={() => { setWizard(true); setCommand(''); }}>Deploy your first application <span>↗</span></button><div className="stack-art" aria-hidden="true"><i/><i/><i/></div></div>
      <div className="metric-grid"><article><span>Applications</span><strong>{status.connected ? status.deployments.length : '—'}</strong><small>{status.connected ? 'In server snapshot' : 'Connect server to view'}</small><b aria-hidden="true">◈</b></article><article><span>Running containers</span><strong>{status.connected ? running : '—'}</strong><small>{status.stale ? 'Snapshot needs refreshing' : 'From your own infrastructure'}</small><b aria-hidden="true">↗</b></article><article><span>Database tools</span><strong>PostgreSQL</strong><small>Table editor · migrations · RLS foundation</small><b aria-hidden="true">▤</b></article></div></>}
      {['Overview', 'Deployments'].includes(view) && <section className="console-section"><div className="section-title"><div><h2>{view === 'Overview' ? 'Your applications' : 'Deployment status'}</h2><p>{status.connected ? `${status.stale ? 'Outdated snapshot' : 'Server snapshot'} · ${status.generatedAt ? new Date(status.generatedAt).toLocaleString() : ''}` : 'Connect the server to see your real applications here.'}</p></div><button onClick={() => setRefresh(value => value + 1)}>↻ Refresh</button></div>
      <div className="console-search"><span aria-hidden="true">⌕</span><input aria-label="Search applications" placeholder="Search applications…" value={filter} onChange={e => setFilter(e.target.value)} /><span>{status.deployments.length} apps</span></div>
      {loading ? <div className="console-empty" role="status">Loading your workspace…</div> : !status.connected ? <div className="console-empty"><div className="empty-glyph">◈</div><h3>Let’s connect your server.</h3><p>Your test app may already be running. Connect its status<br/>to bring real deployment data into this workspace.</p><button className="primary" onClick={() => setView('Settings')}>Connect server →</button><small>No demo applications or simulated metrics.</small></div> : !apps.length ? <div className="console-empty"><h3>{filter ? 'No matching applications' : 'Ready for your first deployment'}</h3><p>{filter ? 'Try a different application name.' : 'Deploy the included hello app, then export a fresh server snapshot.'}</p></div> : <div className="project-grid">{apps.map(app => <button className="project-card" key={app.name} onClick={() => setSelected(selected === app.name ? null : app.name)} aria-expanded={selected === app.name}><div><span className="project-avatar">{app.name.charAt(0).toUpperCase()}</span><span className={`status-chip ${app.state === 'running' && app.health !== 'unhealthy' ? 'good' : ''}`}>{status.stale ? 'Snapshot stale' : app.state}</span></div><h3>{app.name}</h3><p>Docker application · localhost:{app.port ?? '—'}</p><footer><span>● {app.health}</span><span>View details ↗</span></footer></button>)}</div>}
      {selected && status.deployments.filter(app => app.name === selected).map(app => <section className="detail-panel" key={app.name}><div className="section-title"><h3>{app.name}</h3><button onClick={() => setSelected(null)}>Close</button></div><dl><dt>Image</dt><dd>{app.image}</dd><dt>Health</dt><dd>{app.health}</dd><dt>Created</dt><dd>{new Date(app.created).toLocaleString()}</dd><dt>Public domain</dt><dd>Not connected</dd></dl><p>Inspect application logs on Ubuntu:</p><CopyCommand text={`docker logs --tail 100 defaultstack-app-${app.name}`} /></section>)}
      </section>}
      {view === 'Overview' && <div className="quick-grid"><button onClick={() => setView('Database')}><span>▤</span><div><h3>Explore your database</h3><p>View and edit users and products.</p></div><b>→</b></button><button onClick={() => setView('Migrations & RLS')}><span>⌘</span><div><h3>A foundation for secure data</h3><p>Schema migrations and owner isolation.</p></div><b>→</b></button></div>}
      {view === 'Database' && <DatabaseEditor />}
      {view === 'Migrations & RLS' && <div className="console-section guide-panel"><span className="status-chip">Foundation available · not applied</span><h2>Schema changes, tracked in Git.</h2><p>Each migration runs in a transaction. Applied file checksums prevent accidental edits, and a database lock prevents concurrent migration runs.</p><div className="migration-row"><span className="file-icon">SQL</span><div><strong>0001_projects_rls.sql</strong><p>Projects table · owner index · row level security</p></div><span>Not verified on your server</span></div><h3>Owner isolation built into PostgreSQL</h3><p>The example policy restricts reads and writes by owner. It still needs verified login sessions and a dedicated runtime database role before application use.</p><div className="console-callout">Use an isolated test database first. These files have not changed your existing users or products tables.</div><h3>Run the migration from Ubuntu</h3><CopyCommand text="PGHOST=127.0.0.1 PGUSER=YOUR_MIGRATION_USER PGDATABASE=defaultstack_test bash database/migrate.sh" /><p>Setup and role requirements: <code>database/README.md</code>. SQL execution from this dashboard is not enabled yet.</p></div>}
      {view === 'Settings' && <div className="console-section guide-panel"><span className="console-label">SERVER CONNECTION</span><h2>Real status. No Docker access in the browser.</h2><p>The deploy user exports a small read-only snapshot. The dashboard reads that file; it does not need Docker permissions.</p><h3>1. Export the current state on Ubuntu</h3><CopyCommand text="node deploy/apps/export-status.mjs" /><h3>2. Add this to the frontend’s .env.local</h3><CopyCommand text="DEFAULTSTACK_STATE_DIR=/home/coded/.local/state/defaultstack" /><p>Restart Next.js after changing the setting. Run it as the same user that exported the snapshot, or grant read access to that file explicitly.</p><h3>3. Refresh after a deployment</h3><CopyCommand text="node deploy/apps/export-status.mjs" /><div className="console-callout">The dashboard polls the file every 15 seconds. Snapshots older than two minutes are marked stale. Exporting a snapshot is currently a manual step.</div><div className="settings-list"><div><span>Public domain</span><strong>defaultstackr.cloud · Vercel linked, DNS pending</strong></div><div><span>Database editor</span><strong>Private network opt-in</strong></div><div><span>Authentication</span><strong>Not implemented · keep workspace private</strong></div><div><span>Git workflow</span><strong>Push branch → pull on Ubuntu → deploy</strong></div></div></div>}
      <footer className="console-footer"><span><span className="accent">◆</span> DefaultStack by CodedByDefault</span><span>Built on your terms.</span></footer></div>
    </section>
    {wizard && <dialog ref={dialog} className="deploy-modal" aria-labelledby="deploy-title" onCancel={() => setWizard(false)}><div className="section-title"><span className="console-eyebrow">NEW DEPLOYMENT</span><button autoFocus aria-label="Close deployment setup" onClick={() => setWizard(false)}>✕</button></div><h2 id="deploy-title">Give your app a home.</h2><p>Prepare a deployment command for trusted source code on your Ubuntu server.</p><form onSubmit={prepare}><label>Application name<input required pattern="[a-z][a-z0-9-]{0,39}" value={name} onChange={e => { setName(e.target.value); setCommand(''); }} /></label><label>Source folder<input required value={source} onChange={e => { setSource(e.target.value); setCommand(''); }} /><small>Local folder containing a Dockerfile. The sample app is ready to use.</small></label><label>Local port<input required type="number" min="3200" max="3299" step="1" value={port} onChange={e => { setPort(e.target.value); setCommand(''); }} /></label><div className="console-callout">The app must listen on port 8080 and provide /healthz. This prepares a command; it does not launch a deployment from the browser.</div><button className="primary">Prepare deployment →</button></form>{command && <div role="status"><h3>Run in your frontend repository on Ubuntu</h3><CopyCommand text={command} /></div>}</dialog>}
  </main>;
}
