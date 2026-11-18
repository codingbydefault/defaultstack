'use client';

import { useEffect, useState } from 'react';
import { createAuthClient } from 'better-auth/react';

type Status = { configured: boolean; connected: boolean; automatic: boolean; customer: boolean; login: string | null; installUrl: string | null };
const authClient = createAuthClient();
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
      const statusResponse = await fetch('/api/github/status', { cache: 'no-store' });
      const details = await statusResponse.json() as Status & { error?: string };
      if (!statusResponse.ok) throw new Error(details.error || 'GitHub-status laden mislukt.');
      setStatus(details);
      if (details.connected) {
        const reposResponse = await fetch('/api/github/repositories', { cache: 'no-store' });
        const data = await reposResponse.json() as { items?: GitHubRepo[]; truncated?: boolean; error?: string };
        if (!reposResponse.ok) throw new Error(data.error || 'Repositories laden mislukt.');
        setRepos(Array.isArray(data.items) ? data.items : []);
        setTruncated(data.truncated === true);
      } else { setRepos([]); setTruncated(false); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'GitHub laden mislukt.');
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

  async function connect() {
    if (!status?.customer) { window.location.assign('/api/github/connect'); return; }
    setError('');
    try {
      const result = await authClient.linkSocial({ provider: 'github', callbackURL: '/app/projects/new' });
      if (result.error) setError('GitHub koppelen is mislukt.');
    } catch { setError('GitHub koppelen is mislukt.'); }
  }

  const matches = repos.filter(repo => repo.fullName.toLocaleLowerCase('nl-NL').includes(search.toLocaleLowerCase('nl-NL')));
  return <section className="console-section github-panel" aria-labelledby="github-panel-title">
    <div className="section-title"><div><p className="console-eyebrow">BRONCODE</p><h2 id="github-panel-title">GitHub koppeling</h2><p>Kies een repository waarvoor de DefaultStackr GitHub App toegang heeft.</p></div><span className="github-mark" aria-hidden="true">⌘</span></div>
    {loading ? <p role="status" className="field-hint">GitHub laden…</p> : <>
      {error && <p role="alert" className="db-error">{error}</p>}
      {!status?.configured ? <p className="console-callout">De GitHub App is nog niet ingesteld op de server. Zodra de beheerder de koppeling configureert, kun je hier je repositories kiezen.</p> : !status.connected ? <div className="github-actions"><button type="button" className="primary" onClick={() => void connect()}>Koppel GitHub <span aria-hidden="true">↗</span></button><p>Je meldt je aan bij GitHub en kiest welke repositories de app mag zien.</p></div> : <>
        <div className="github-connected"><span className="pulse-dot" /> Verbonden als <strong>{status.login}</strong>{!status.automatic && <button type="button" onClick={() => void disconnect()}>Ontkoppelen</button>}</div>
        {repos.length === 0 ? <p className="console-callout">De GitHub App heeft nog geen toegang tot repositories. Installeer de app en selecteer je projecten.</p> : <>
          <label className="projects-search github-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Zoek GitHub-repositories" placeholder="Zoek repositories" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <div className="github-repos">{matches.map(repo => <div className="github-repo" key={repo.id}><div><strong>{repo.fullName}</strong><small>{repo.private ? 'Privé' : 'Publiek'} · {repo.defaultBranch}</small></div>{onSelect && <button type="button" disabled={repo.private} title={repo.private ? 'Privé-repositories vereisen nog deploytoegang voor de worker.' : undefined} onClick={() => onSelect(repo)}>Selecteer ↗</button>}</div>)}</div>
          {matches.length === 0 && <p className="field-hint">Geen repositories gevonden.</p>}
          {truncated && <p className="field-hint">Er zijn meer repositories dan hier worden getoond. Verfijn de selectie in de GitHub App.</p>}
          {repos.some(repo => repo.private) && onSelect && <p className="field-hint">Privé-repositories zijn zichtbaar, maar worden pas selecteerbaar zodra de deploy-worker een installatie-token gebruikt.</p>}
        </>}
        {status.installUrl && <a className="github-install" href={status.installUrl} target="_blank" rel="noreferrer">Repositories toevoegen via GitHub ↗</a>}
      </>}
    </>}
  </section>;
}
