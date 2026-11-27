'use client';

import { useEffect, useState } from 'react';
import { githubResponse } from '@/lib/github/response.mjs';

type Status = { privateDeployReady?: boolean; configured: boolean; connected: boolean; automatic: boolean; customer: boolean; login: string | null; installUrl: string | null };
export type GitHubRepo = { id: number; fullName: string; cloneUrl: string; defaultBranch: string; private: boolean; account: string };

export function GitHubPanel({ onSelect }: { onSelect?: (repo: GitHubRepo) => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try {
      const statusResponse = await fetch('/api/github/status', { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const details = await githubResponse(statusResponse) as unknown as Status;
      setStatus(details);
      if (details.connected) {
        const reposResponse = await fetch('/api/github/repositories', { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
        const data = await githubResponse(reposResponse) as { items?: GitHubRepo[]; truncated?: boolean };
        setRepos(Array.isArray(data.items) ? data.items : []);
        setTruncated(data.truncated === true);
      } else { setRepos([]); setTruncated(false); }
    } catch (cause) {
      if (cause instanceof Error && 'code' in cause && cause.code === 'github_app_connection_required') {
        setStatus(current => current ? { ...current, connected: false } : null); setRepos([]); setError('');
      } else setError(cause instanceof Error && !['TimeoutError','AbortError','TypeError'].includes(cause.name) ? cause.message : 'De verbinding met GitHub is onderbroken. Probeer het opnieuw.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function disconnect() {
    setError('');
    try {
      const response = await fetch('/api/github/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('Ontkoppelen mislukt.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ontkoppelen mislukt.'); }
  }

  function connect() { window.location.assign('/api/github/connect'); }

  const matches = repos.filter(repo => repo.fullName.toLocaleLowerCase('nl-NL').includes(search.toLocaleLowerCase('nl-NL')));
  return <section className="console-section github-panel" aria-labelledby="github-panel-title">
    <div className="section-title"><div><p className="console-eyebrow">BRONCODE</p><h2 id="github-panel-title">GitHub koppeling</h2><p>Kies een repository waarvoor de DefaultStackr GitHub App toegang heeft.</p></div><span className="github-mark" aria-hidden="true">⌘</span></div>
    {loading ? <p role="status" className="field-hint">GitHub laden…</p> : <>
      {error && <div><p role="alert" className="db-error">{error}</p><button type="button" className="outline" onClick={()=>void load()}>Opnieuw proberen</button></div>}
      {!error && (!status?.configured ? <p className="console-callout">De GitHub App is nog niet ingesteld op de server. Zodra de beheerder de koppeling configureert, kun je hier je repositories kiezen.</p> : !status.connected ? <div className="github-actions"><button type="button" className="primary" onClick={() => void connect()}>Koppel GitHub <span aria-hidden="true">↗</span></button><p>Je bent aangemeld bij DefaultStackR. Koppel de GitHub App apart en kies tot welke repositories die toegang krijgt.</p></div> : <>
        <div className="github-connected"><span className="pulse-dot" /> Verbonden als <strong>{status.login}</strong>{!status.automatic && <button type="button" onClick={() => void disconnect()}>Ontkoppelen</button>}</div>
        {repos.length === 0 ? <p className="console-callout">De GitHub App heeft nog geen toegang tot repositories. Installeer de app en selecteer je projecten.</p> : <>
          <label className="projects-search github-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Zoek GitHub-repositories" placeholder="Zoek repositories" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <div className="github-repos">{matches.map(repo => <div className="github-repo" key={repo.id}><div><strong>{repo.fullName}</strong><small>{repo.private ? 'Privé' : 'Publiek'} · {repo.defaultBranch}</small></div>{onSelect && <button type="button" disabled={repo.private && !status.privateDeployReady} title={repo.private && !status.privateDeployReady ? 'Privé-repositories vereisen nog deploytoegang voor de worker.' : undefined} onClick={() => onSelect(repo)}>Selecteer ↗</button>}</div>)}</div>
          {matches.length === 0 && <p className="field-hint">Geen repositories gevonden.</p>}
          {truncated && <p className="field-hint">Er zijn meer repositories dan hier worden getoond. Verfijn de selectie in de GitHub App.</p>}
          {!status.privateDeployReady && repos.some(repo => repo.private) && onSelect && <p className="field-hint">Privé-repositories zijn zichtbaar, maar worden pas selecteerbaar zodra de deploy-worker een installatie-token gebruikt.</p>}
        </>}
        {status.installUrl && <a className="github-install" href={status.installUrl} target="_blank" rel="noreferrer">Repositories toevoegen via GitHub ↗</a>}
      </>)}
    </>}
  </section>;
}
