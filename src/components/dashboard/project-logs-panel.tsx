'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, dashboardApi } from '@/lib/api/client';
import type { Deployment, LogLine } from '@/lib/api/types';
import { chipClass, deploymentStatusLabel, formatWhen } from '@/components/dashboard/format';

function detail(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

export function ProjectLogsPanel({ projectId }: { projectId: string }) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(true);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'build' | 'runtime'>('build');
  const terminal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const fromUrl = new URLSearchParams(window.location.search).get('deployment');
    async function load() {
      try {
        const next = await dashboardApi.deployments(projectId);
        if (!active) return;
        setDeployments(next);
        setSelected(current => current && next.some(item => item.id === current) ? current :
          next.find(item => item.id === fromUrl)?.id ?? next.find(item => item.current)?.id ?? next[0]?.id ?? null);
        setError('');
      } catch (cause) {
        if (active) setError(detail(cause, 'Uitrollen laden mislukt.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [projectId]);

  const current = deployments.find(item => item.id === selected) ?? null;
  const updating = current?.status === 'queued' || current?.status === 'building';

  useEffect(() => {
    if (!selected) { setLines([]); return; }
    let active = true;
    const deploymentId = selected;
    setLines([]);
    async function load() {
      try {
        const next = mode === 'build' ? await dashboardApi.logs(projectId, deploymentId) : await dashboardApi.runtimeLogs(projectId, deploymentId);
        if (active) { setLines(next.lines); setError(''); }
      } catch (cause) {
        if (active) setError(detail(cause, 'Logs laden mislukt.'));
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), updating ? 2000 : 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [projectId, selected, updating, mode]);

  useEffect(() => {
    if (following && terminal.current) terminal.current.scrollTop = terminal.current.scrollHeight;
  }, [lines, following, query]);

  const visible = query.trim() ? lines.filter(line => line.message.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : lines;

  return <section className="project-logs" aria-label="Projectlogs">
    <div className="section-title"><div><h2>Projectlogs</h2><p>Elke uitrol heeft een eigen bouwlog en proceslog. Actieve logs worden automatisch bijgewerkt.</p></div><span className="logs-count">{deployments.length} uitrollen</span></div>
    {error && <p className="db-error" role="alert">{error}</p>}
    {loading ? <div className="console-empty" role="status">Logs laden…</div> : deployments.length === 0 ? <div className="console-empty">Nog geen uitrollen of logs voor dit project.</div> : <>
      <div className="logs-toolbar"><label>Uitrol
        <select value={selected ?? ''} onChange={event => { setSelected(event.target.value); setFollowing(true); }}>
          {deployments.map(item => <option key={item.id} value={item.id}>#{item.id} · {deploymentStatusLabel[item.status]} · {formatWhen(item.createdAt)}{item.current ? ' · huidig' : ''}</option>)}
        </select>
      </label><label>Zoek in logs<input type="search" value={query} placeholder="Filter regels…" onChange={event => setQuery(event.target.value)} /></label></div>
      {current && <div className="logs-meta"><span className={`status-chip ${chipClass(current.status)}`}>{deploymentStatusLabel[current.status]}</span><span>Branch: {current.branch}</span><span>Commit: {current.commitSha?.slice(0, 7) ?? 'nog onbekend'}</span><span>Gestart: {formatWhen(current.createdAt)}</span></div>}
      <div className="logs-mode" role="group" aria-label="Soort log"><button type="button" className={mode === 'build' ? 'active' : ''} aria-pressed={mode === 'build'} onClick={() => setMode('build')}>Bouw & uitrol</button><button type="button" className={mode === 'runtime' ? 'active' : ''} aria-pressed={mode === 'runtime'} onClick={() => setMode('runtime')}>App-proces</button></div>
      <div className="terminal-shell">
        <div className="terminal-bar"><div className="terminal-dots" aria-hidden="true"><i/><i/><i/></div><strong>defaultstackr / {projectId} / #{selected} / {mode === 'build' ? 'build' : 'proces'}</strong><span className={updating || mode === 'runtime' && current?.current ? 'terminal-live' : 'terminal-stored'}>{updating || mode === 'runtime' && current?.current ? '● LIVE' : '● OPGESLAGEN'}</span></div>
        <div ref={terminal} className="terminal-output" role="log" aria-label={`${mode === 'build' ? 'Bouwlog' : 'Proceslog'} van uitrol ${selected}`} aria-live={updating ? 'polite' : 'off'}>
          {visible.length === 0 ? <p className="terminal-empty">{query ? 'Geen regels gevonden.' : updating ? 'Wachten op de eerste logregel…' : mode === 'runtime' ? 'Geen proceslogs opgeslagen voor deze uitrol. Voor eerdere uitrollen worden die niet met terugwerkende kracht aangemaakt.' : 'Voor deze uitrol zijn geen logregels opgeslagen.'}</p> : visible.map((line, index) => <div className={`terminal-line terminal-${line.level}`} key={`${line.id}-${index}`}><span className="terminal-number" aria-hidden="true">{String(index + 1).padStart(3, '0')}</span>{line.timestamp && <time dateTime={line.timestamp}>{new Date(line.timestamp).toLocaleTimeString('nl-NL')}</time>}<span className="terminal-message">{line.message}</span></div>)}
        </div>
        <div className="terminal-bottom"><span>{visible.length} van {lines.length} regels</span><label><input type="checkbox" checked={following} onChange={event => setFollowing(event.target.checked)} /> Volg nieuwe regels</label><button type="button" onClick={() => { if (selected) void (mode === 'build' ? dashboardApi.logs(projectId, selected) : dashboardApi.runtimeLogs(projectId, selected)).then(chunk => { setLines(chunk.lines); setError(''); }).catch(cause => setError(detail(cause, 'Vernieuwen mislukt.'))); }}>Vernieuwen ↻</button></div>
      </div>
      <p className="logs-note">Je ziet alleen de gekozen uitrol. Proceslogs worden vanaf nieuwe uitrollen afzonderlijk bewaard; oude PM2-logs kunnen hier niet automatisch worden teruggehaald.</p>
    </>}
  </section>;
}
