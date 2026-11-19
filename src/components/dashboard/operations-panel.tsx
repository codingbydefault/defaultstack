'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api/client';
import type { OperationsSnapshot } from '@/lib/api/types';

const labels: Record<string, string> = {
  database: 'Database', 'deploy-worker': 'Uitrolworker', 'database-backup': 'Dagelijkse back-up',
  'backup-disk': 'Opslagruimte', 'recent-deploys': 'Recente uitrollen',
};

function when(value: string): string {
  return new Date(value).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' });
}

export function OperationsPanel() {
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState<Date | null>(null);
  const [source, setSource] = useState('alle');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await dashboardApi.operations();
        if (active) { setSnapshot(result); setError(''); setUpdated(new Date()); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Platformstatus laden mislukt.');
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const checks = snapshot?.checks ?? [];
  const problems = checks.filter(check => check.status !== 'ok');
  const events = snapshot?.events.filter(event => source === 'alle' || event.source === source) ?? [];
  const sources = [...new Set(snapshot?.events.map(event => event.source) ?? [])];

  return <section className="ops-panel" aria-label="Platformbewaking">
    <div className="section-title"><div><h2>Platformbewaking</h2><p>Status en opgeslagen gebeurtenissen van database, worker, opslag en back-ups. Dit overzicht ververst elke 30 seconden.</p></div><span className="ops-updated">{updated ? `Bijgewerkt ${updated.toLocaleTimeString('nl-NL')}` : 'Nog niet bijgewerkt'}</span></div>
    {error && <p className="db-error" role="alert">{error}</p>}
    {!snapshot && !error && <p className="console-callout" role="status">Platformstatus laden…</p>}
    {snapshot && checks.length === 0 && <p className="console-callout">De monitor heeft nog geen controles geregistreerd. Start de monitor op de server om statusmeldingen te zien.</p>}
    {checks.length > 0 && <><div className={`ops-summary ${problems.some(item => item.status === 'critical') ? 'critical' : problems.length ? 'warning' : 'ok'}`} role="status"><span className="ops-pulse" />{problems.length ? `${problems.length} aandachtspunt${problems.length === 1 ? '' : 'en'}` : 'Alle controles in orde'}</div><div className="ops-checks">{checks.map(check => <article key={check.code} className={`ops-${check.status}`}><div><span className="ops-indicator" /><strong>{labels[check.code] ?? check.code}</strong><small>{check.status === 'ok' ? 'OK' : check.status === 'warning' ? 'LET OP' : 'KRITIEK'}</small></div><p>{check.message}</p><time dateTime={check.checkedAt}>Gecontroleerd: {when(check.checkedAt)}</time></article>)}</div></>}
    {snapshot && <div className="ops-columns"><div className="ops-events"><div className="section-title"><div><h2>Systeemlog</h2><p>Nieuwe storingen en herstelmeldingen worden bewaard.</p></div><label>Bron <select value={source} onChange={event => setSource(event.target.value)}><option value="alle">Alle</option>{sources.map(item => <option key={item} value={item}>{labels[item] ?? item}</option>)}</select></label></div><div className="ops-event-list" role="log" aria-label="Platformgebeurtenissen">{events.length ? events.map(event => <div key={event.id} className={`ops-event ops-${event.severity}`}><time dateTime={event.createdAt}>{when(event.createdAt)}</time><strong>{labels[event.source] ?? event.source}</strong><span>{event.message}</span></div>) : <p className="console-callout">Nog geen gebeurtenissen voor deze bron.</p>}</div></div><div className="ops-backups"><h2>Laatste back-ups</h2><p>Er blijven maximaal vijf gevalideerde kopieën bewaard.</p>{snapshot.backups.length ? <ul>{snapshot.backups.map(item => <li key={item.id}><strong>{when(item.createdAt)}</strong><span>{(item.sizeBytes / 1024 / 1024).toFixed(1)} MB</span></li>)}</ul> : <p className="console-callout">Nog geen back-up geregistreerd.</p>}</div></div>}
  </section>;
}
