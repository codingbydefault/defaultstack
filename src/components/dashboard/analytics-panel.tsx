'use client';

import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/dashboard/copy-button';

type Analytics = { total: number; days: Array<{ day: string; views: number }>; pages: Array<{ path: string; views: number }>; error?: string };

export function AnalyticsPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/analytics`, { cache: 'no-store' }).then(async response => {
      const result = await response.json() as Analytics;
      if (!response.ok) throw new Error(result.error || 'Analytics laden mislukt.');
      if (active) setData(result);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Analytics laden mislukt.'); });
    return () => { active = false; };
  }, [projectId]);

  const max = Math.max(1, ...(data?.days.map(day => day.views) || []));
  const snippet = `<script defer src="https://www.defaultstackr.cloud/api/analytics/script?project=${encodeURIComponent(projectId)}"></script>`;
  return <div className="stack-gap">
    <div className="section-title"><div><h2>Analytics</h2><p>Paginaweergaven van de afgelopen 14 dagen. We bewaren geen bezoekers-ID of IP-adres in deze statistieken.</p></div></div>
    {error && <p role="alert" className="db-error">{error}</p>}
    {!data && !error ? <div className="console-empty" role="status">Analytics laden…</div> : data && <>
      <div className="analytics-summary"><span>PAGINAWEERGAVEN / 14 DAGEN</span><strong>{data.total.toLocaleString('nl-NL')}</strong><small>{data.total === 0 ? 'Nog geen metingen ontvangen.' : 'Tellingen van jouw gekoppelde domeinen.'}</small></div>
      <section className="console-section"><h3>Verkeer per dag</h3><div className="analytics-bars" role="img" aria-label="Paginaweergaven per dag">{data.days.length === 0 ? <p>Nog geen gegevens.</p> : data.days.map(day => <div key={day.day} title={`${String(day.day).slice(0, 10)} · ${day.views} weergaven`}><span style={{ height: `${Math.max(5, day.views / max * 100)}%` }} /><small>{String(day.day).slice(5, 10)}</small></div>)}</div></section>
      <section className="console-section"><h3>Meest bezochte pagina’s</h3>{data.pages.length === 0 ? <p className="field-hint">Nog geen gegevens.</p> : <ol className="analytics-pages">{data.pages.map(page => <li key={page.path}><span>{page.path}</span><strong>{page.views}</strong></li>)}</ol>}</section>
    </>}
    <section className="console-section analytics-setup"><h3>Metingen activeren</h3><p>Voeg dit script toe aan de pagina’s van je project. Het telt alleen het pad van een paginaweergave; queryparameters en bezoekersprofielen worden niet meegestuurd.</p><pre>{snippet}</pre><CopyButton value={snippet} label="Kopieer script" /><p className="field-hint">Bij clientnavigatie in een single page app telt deze eerste versie alleen volledige paginaladingen.</p></section>
  </div>;
}
