'use client';
import { useEffect, useState } from 'react';
import type { BuildRecord } from '@/lib/build-store';
type Detail = { build: BuildRecord; log: { text: string; truncated: boolean } };
const labels: Record<string, string> = { building: 'Building', ready: 'Built & started', failed: 'Failed', 'rolled-back': 'Rolled back' };
export default function BuildLogs() {
  const [builds, setBuilds] = useState<BuildRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      try {
        const results = await Promise.all([fetch('/api/builds', { signal: controller.signal, cache: 'no-store' }), ...(selected ? [fetch(`/api/builds/${selected}`, { signal: controller.signal, cache: 'no-store' })] : [])]);
        const list = await results[0].json();
        if (!results[0].ok) throw new Error(list.error || 'Could not read builds');
        const output = results[1] ? await results[1].json() : null;
        if (results[1] && !results[1].ok) throw new Error(output.error || 'Could not read output');
        if (!controller.signal.aborted) { setBuilds(list.builds); setDetail(output); setError(''); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Build logs unavailable'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void read();
    const timer = setInterval(() => void read(), 5000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [selected, refresh]);
  return <section className="console-section"><div className="section-title"><div><h2>Build history</h2><p>Build output from your own Ubuntu deployments. Refreshes every five seconds.</p></div><button onClick={() => setRefresh(value => value + 1)}>Refresh</button></div>
    {error ? <div className="console-callout" role="alert"><p>{error}</p><p>Local setup: set DEFAULTSTACK_STATE_DIR and ENABLE_LOCAL_BUILD_LOGS=true in the private dashboard’s .env.local, then restart. Keep this disabled on a public dashboard until authentication is implemented.</p></div> : loading ? <p role="status">Loading builds…</p> : !builds.length ? <div className="console-empty"><h3>Your next build starts the timeline.</h3><p>New deployments record build output automatically. Earlier deployments have no stored logs.</p></div> : <div className="build-workspace"><div className="build-list" aria-label="Build history">{builds.map(build => <button key={build.id} aria-pressed={selected === build.id} onClick={() => { setSelected(build.id); setDetail(null); }}><strong>{build.app}</strong><span className={`status-chip ${build.status === 'ready' ? 'good' : ''}`}>{labels[build.status]}</span><small>{new Date(build.startedAt).toLocaleString()}</small><code>{build.id}</code></button>)}</div><div className="build-output">{!selected ? <div className="console-empty"><h3>Every build has a story.</h3><p>Select a build to inspect its output.</p></div> : !detail ? <p role="status">Loading output…</p> : <><div className="section-title"><h3>{detail.build.app}</h3><span className="status-chip">{labels[detail.build.status]}</span></div><p className="db-muted">{detail.build.image}</p>{detail.log.truncated && <p className="db-warning">Showing the last 64 KiB of stored output.</p>}<pre tabIndex={0} aria-label="Build output"><code>{detail.log.text || 'Waiting for build output…'}</code></pre><small>Output is stored up to 5 MiB per build. “Built & started” confirms the container, not public DNS or HTTPS.</small></>}</div></div>}
  </section>;
}
